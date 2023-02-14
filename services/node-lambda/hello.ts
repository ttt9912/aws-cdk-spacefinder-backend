import { v4 } from 'uuid';
import { APIGatewayProxyEvent } from 'aws-lambda';

/*
 * Use an external dependency uuid to demonstrate bundling
 * and compilation of typescript lambdas
 *
 * npm i uuid
 * npm i @types/uuid
 */
async function handler(event: any, context: any) {
    return {
        statusCode: 200,
        body: 'Hello from Lambda ' + v4()
    }
}

export { handler }
