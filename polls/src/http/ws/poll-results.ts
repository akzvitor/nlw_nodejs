import { FastifyInstance } from "fastify";
import { voting } from "../../utils/voting-pub-sub";
import { z } from "zod";

export async function pollResults(app: FastifyInstance) {
    /**
     * Creating the Websocket route
     * It means the connection will be continuous, in real time
     * The user will know every time a new vote is registered
     */
    app.get('/polls/:pollId/results', { websocket: true }, (connection, request) => {
        // Getting the pollId
        const getPollParams = z.object({
            pollId: z.string().uuid(),
        })

        const { pollId } = getPollParams.parse(request.params)

        // Receiving the message of the specific channel (pollId) and returning it
        voting.subscribe(pollId, (message) => {
            connection.socket.send(JSON.stringify(message))
        })
    })
}