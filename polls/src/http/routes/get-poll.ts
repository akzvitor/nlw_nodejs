import { z } from "zod"
import { prisma } from "../../lib/prisma"
import { FastifyInstance } from "fastify"
import { redis } from "../../lib/redis"

export async function getPoll(app: FastifyInstance) {

    /**
     * Creating a route to obtain details about a specific poll
     * GET requests don't have body, but params
     * References a poll by it's ID, passed in the URL
     */
    app.get('/polls/:pollId', async (request, reply) => {

        /**
         * The param must be the ID of the poll
         * Using zod to validate data
         */
        const getPollParams = z.object({
            pollId: z.string().uuid(), 
        })
    
        // Receiving the pollId
        const { pollId } = getPollParams.parse(request.params)
    
        
        // Function to find the poll whose ID is the same as the one passed in the param
        const poll = await prisma.poll.findUnique({

            // This returns all the poll data
            where: {
                id: pollId,
            },

            // This returns the options selected data, ID and title
            include: {
                options: {
                    select: {
                        id: true,
                        title: true,
                    }
                }
            }
        })

        // Just verifying if the poll exists
        if (!poll) {
            return reply.status(400).send({ message: 'Poll not found.' })
        }

        /**
         * Returning the ranking of the options with their scores
         * pollId is the rank searched (the poll itself)
         * 2nd and 3rd params are the range, so 0 to -1 represents all options
         * WITHSCORES, as the name says, return the score of each option
         */
        const result = await redis.zrange(pollId, 0, -1, 'WITHSCORES')

        /**
         * Converting the result array into an object using the reduce method
         */
        const votes = result.reduce((obj, line, index) => {

            /**
             * The even indexes are the pollId's and the odd are the number of votes
             * So "score" will store the elements of the odd positions of the array
             */
            if (index % 2 === 0) {
                const score = result[index + 1]

                Object.assign(obj, { [line]: Number(score) })
            }

            return obj
        }, {} as Record<string, number>)

        return reply.send({
            poll: {
                id: poll.id,
                title: poll.title,
                options: poll.options.map(option => {
                    return {
                        id: option.id,
                        title: option.title,
                        score: (option.id in votes) ? votes[option.id] : 0
                    }
                })
            }
        })
    })
} 