/**
 * Using the Pub/Sub event pattern
 * This will allows ws to know and send a message every time a new vote is registered
 */

type Message = { pollOptionId: string, votes: number }
type Subscriber = (message: Message) => void

class VotingPubSub {
    private channels: Record<string, Subscriber[]> = {}

    // Method to subscribe the users in the channel
    subscribe(pollId: string, subscriber: Subscriber) {
        if(!this.channels[pollId]) {
            this.channels[pollId] = []
        }

        this.channels[pollId].push(subscriber)
    }

    // Method to publish the message for each subscriber of the channel
    publish(pollId:string, message: Message) {
        if (!this.channels[pollId]) {
            return;
        }

        for (const subscriber of this.channels[pollId]) {
            subscriber(message)
        }
    }
}

export const voting = new VotingPubSub()