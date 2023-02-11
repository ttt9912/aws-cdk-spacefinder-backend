import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 } from 'uuid';
import { validateSpaceEntry } from '../shared/InputValidator';

const TABLE_NAME = process.env.TABLE_NAME;
const dbClient = new DynamoDB.DocumentClient();

// For using typed lambdas
// npm i @types/aws-lambda
async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    const result: APIGatewayProxyResult = {
        statusCode: 200,
        body: 'Hello from DynamoDB'
    }

    const item = typeof event.body == 'object'
        ? event.body
        : JSON.parse(event.body)
    item.spaceId = v4();

    try {
        validateSpaceEntry(item);
        await dbClient.put({
            TableName: TABLE_NAME!,
            Item: item
        }).promise();
        result.body = JSON.stringify(`Created item with id=${item.spaceId}`);
    } catch (error: any) {
        result.body = error.message;
    }

    return result;
}

export { handler }
