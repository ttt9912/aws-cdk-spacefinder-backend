import { DynamoDB } from 'aws-sdk';
import {
    APIGatewayProxyEvent,
    APIGatewayProxyEventQueryStringParameters,
    APIGatewayProxyResult,
    Context
} from 'aws-lambda';

const TABLE_NAME = process.env.TABLE_NAME;
const PRIMARY_KEY = process.env.PRIMARY_KEY;
const dbClient = new DynamoDB.DocumentClient();

// For using typed lambdas
// npm i @types/aws-lambda
async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    const result: APIGatewayProxyResult = {
        statusCode: 200,
        body: 'Hello from DynamoDB'
    }

    try {
        // if queryparam is the primary key (ie. ?spaceId=123212) Query for Primary Key
        // if any other queryparam is set, query for secondary index. Throws an error if it is not a secondary index
        // if no queryparam is set, scan the table
        if (event.queryStringParameters) {
            if (PRIMARY_KEY! in event.queryStringParameters) {
                result.body = await queryWithPrimaryPartition(event.queryStringParameters)
            }
            else {
                result.body = await queryWithSecondaryPartition(event.queryStringParameters)
            }
        } else {
            result.body = await scanTable();
        }
    } catch (error: any) {
        result.body = error.message;
    }

    return result;
}

async function queryWithPrimaryPartition(queryparams: APIGatewayProxyEventQueryStringParameters) {
    const keyValue = queryparams[PRIMARY_KEY!];
    const queryResponse = await dbClient.query({
        TableName: TABLE_NAME!,
        KeyConditionExpression: '#k = :v',
        ExpressionAttributeNames: {
            '#k': PRIMARY_KEY!
        },
        ExpressionAttributeValues: {
            ':v': keyValue
        }
    }).promise();
    return JSON.stringify(queryResponse)
}

async function queryWithSecondaryPartition(queryparams: APIGatewayProxyEventQueryStringParameters) {
    const queryKey = Object.keys(queryparams)[0];
    const queryValue = queryparams[queryKey];
    const queryResponse = await dbClient.query({
        TableName: TABLE_NAME!,
        IndexName: queryKey,
        KeyConditionExpression: '#k = :v',
        ExpressionAttributeNames: {
            '#k': queryKey
        },
        ExpressionAttributeValues: {
            ':v': queryValue
        }
    }).promise();
    return JSON.stringify(queryResponse)
}

async function scanTable() {
    const queryResponse = await dbClient.scan({
        TableName: TABLE_NAME!
    }).promise();
    return JSON.stringify(queryResponse)
}

export { handler }
