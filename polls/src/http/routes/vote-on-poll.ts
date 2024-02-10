import { z } from "zod"
import { randomUUID } from "node:crypto"
import { prisma } from "../../lib/prisma"
import { FastifyInstance } from "fastify"
import { redis } from "../../lib/redis"
import { voting } from "../../utils/voting-pub-sub"

export async function voteOnPoll(app: FastifyInstance) {

    /**
     * Creating a route to register the vote of the user
     * User can vote in an option of a specific poll
     * The pollId must to be passed in the URL to indentify what poll is the user voting
     */
    app.post('/polls/:pollId/votes', async (request, reply) => {

        /**
         * Creating the vote
         * Must contain the id of the option whose the user is voting
         */
        const voteOnPollBody = z.object({
            pollOptionId: z.string().uuid()
        })

        // Contain the id of the poll whose the user is voting
        const voteOnPollParams = z.object({
            pollId: z.string().uuid(),
        })


        // Receiving the poll and pollOption id's
        const { pollId } = voteOnPollParams.parse(request.params)
        const { pollOptionId } = voteOnPollBody.parse(request.body)

        // Using cookies to ensure that each user only votes once
        let { sessionId } = request.cookies

        // Verify if the user already has a session ID
        if (sessionId) {

            // Searches if there is a vote from that user in that poll
            const userPreviousVoteOnPoll = await prisma.vote.findUnique({
                where: {
                    sessionId_pollId: {
                        sessionId,
                        pollId,
                    },
                }
            })

            /**
             * Checks if the user is trying to vote for the same option
             * If so, a message informing is returned
             */
            if (userPreviousVoteOnPoll && userPreviousVoteOnPoll.pollOptionId !== pollOptionId) {

                /**
                 * If the user tries to vote in a different option, that is, change the vote:
                 * The previous vote is deleted
                 * The new vote is created below in the properly function
                 */
                await prisma.vote.delete({
                    where: {
                        id: userPreviousVoteOnPoll.id,
                    }
                })

                /**
                * Using zincrby to make a "rank" of the options, counting the votes of each of them
                * This function is executed when the user wants to change his vote
                * So decrement the points of the previous option
                 */
                const votes = await redis.zincrby(pollId, -1, userPreviousVoteOnPoll.pollOptionId)

                voting.publish(pollId, {
                    pollOptionId: userPreviousVoteOnPoll.pollOptionId,
                    votes: Number(votes)
                })
            } else if (userPreviousVoteOnPoll) {
                return reply.status(400).send({ message: 'You already voted on this poll.' })
            }
        }

        // Verify if the user doesn't has a session ID
        if (!sessionId) {
            
            // Create a random ID for the user
            sessionId = randomUUID()

            reply.setCookie('sessionId', sessionId, {

                // Specifies on which routes the cookie will be available
                path: '/',

                // Specifies how much time the cookie will be available
                maxAge: 60 * 60 * 24 * 30, //30 days

                // User won't be able to modify the cookie manually
                signed: true,

                // Ensures that only the backend will be able to access the cookie
                httpOnly: true,
            })
        }

        /**
         * Creating the vote on the database
         * Using await to ensure the function will be executed before proceeding
         * For this reason, it must be a async function
         */
        await prisma.vote.create({
            data: {
                sessionId,
                pollId,
                pollOptionId,
            }
        })

        /**
         * Using zincrby to make a "rank" of the options, counting the votes of each of them
         * Params of zincrby: key, increment, member
         * The poll will be the key, so each poll will have it's own rank of options
         * The increment will be the number of votes of each user, so 1
         * The options of the poll represents the members of the rank
         */
        const votes = await redis.zincrby(pollId, 1, pollOptionId)

        // Using the Pub/Sub event pattern to publish the message
        voting.publish(pollId, {
            pollOptionId,
            votes: Number(votes)
        })

        return reply.status(201).send()
    })
}