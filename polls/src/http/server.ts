import fastify from 'fastify'
import cookie from '@fastify/cookie'
import websocket from '@fastify/websocket'
import { createPoll } from './routes/create-poll'
import { getPoll } from './routes/get-poll'
import { voteOnPoll } from './routes/vote-on-poll'
import { pollResults } from './ws/poll-results'

// Creating the application with fastify framework
const app = fastify()


// Registering all the routes
app.register(cookie, {

    /**
     * Sign the cookie to ensure that the cookie was genterated by the application
     * Prevents the user from copying another id and voting again
     */
    secret: "polls-app-nlw",

    // On the request, places cookies in an object so that they are easier to access for the route
    hook: 'onRequest',
})

app.register(websocket)

app.register(createPoll)
app.register(getPoll)
app.register(voteOnPoll)

app.register(pollResults)

app.listen({ port: 3333 }).then(() => {
    console.log('HTTP server running!')
})