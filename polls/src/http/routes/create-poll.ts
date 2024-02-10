import { z } from "zod"
import { prisma } from "../../lib/prisma"
import { FastifyInstance } from "fastify"


/**
 * Fastify must export an async function
 * Necessary when we are working with routes in different files
 */
export async function createPoll(app: FastifyInstance) {

    // Creating a route to generate a new poll on the database
    app.post('/polls', async (request, reply) => {

        /**
         * Using zod to validate data
         * The request body must contain an object with title and options
         */
        const createPollBody = z.object({
            title: z.string(),
            options: z.array(z.string()),
        })
    
        /**
         * Checking if the format and types are correct
         * Receiving data (title and options)
         */
        const { title, options } = createPollBody.parse(request.body)
    
        /**
         * Creating the poll on the database
         * title, just a unique string
         * options, can be many (createMany) arrays (mapping options and returning an object for each option) 
         * Using await to ensure the function will be executed before proceeding
         * For this reason, it must be a async function
         */
        const poll = await prisma.poll.create({
            data: {
                title,
                options: {
                    createMany: {
                        data: options.map(option => {
                            return { title: option }
                        }),
                    }
                },
            }
        })

        /**
         * Reply to change the status to 201
         * This describes that the http request was successful and a new resource was created as a result
         * Returning the ID as an object for better visualization in the API
         */
        return reply.status(201).send({ pollId: poll.id })
    })
} 