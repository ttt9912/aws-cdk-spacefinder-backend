import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

const TABLE_NAME = process.env.TABLE_NAME as string;
const PRIMARY_KEY = process.env.PRIMARY_KEY as string;
const dbClient = new DynamoDB.DocumentClient();

// For using typed lambdas
// npm i @types/aws-lambda
async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    const result: APIGatewayProxyResult = {
        statusCode: 200,
        body: 'Hello from DynamoDB'
    }

    const spaceId = event.queryStringParameters?.[PRIMARY_KEY];
    const requestBody = typeof event.body == 'object'
        ? event.body
        : JSON.parse(event.body)

    if (requestBody && spaceId) {
        const requestBodyKey = Object.keys(requestBody)[0]; // Only updates one field
        const requestBodyValue = requestBody[requestBodyKey];
        const updateResult = await dbClient.update({
            TableName: TABLE_NAME,
            Key: {
                [PRIMARY_KEY]: spaceId
            },
            UpdateExpression: 'set #xnew = :new',
            ExpressionAttributeNames: {
                '#xnew': requestBodyKey
            },
            ExpressionAttributeValues: {
                ':new': requestBodyValue
            },
            ReturnValues: 'UPDATED_NEW' // return what was updated
        }).promise();
        result.body = JSON.stringify(updateResult);
    }

    return result;
}

export { handler }
