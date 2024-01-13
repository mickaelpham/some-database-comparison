import { MongoClient } from 'mongodb'

const url = process.env.MONGODB_URI
if (url === undefined) {
  throw new Error('undefined MONGODB_URI environment variable')
}

export const client = new MongoClient(url)

export const database = client.db()
