import dbConnect from './dbConnect';

/**
 * Connect to MongoDB via the canonical cached Mongoose connector.
 */
export async function connectToDatabase() {
  return dbConnect();
}

export default dbConnect;
