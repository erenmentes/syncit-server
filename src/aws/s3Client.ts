import { S3Client } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
dotenv.config(); 

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!accessKeyId || !secretAccessKey) {
    throw new Error("Invalid AWS Credentials.");
}

export const s3Client = new S3Client({
    region: "eu-central-1",
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});
