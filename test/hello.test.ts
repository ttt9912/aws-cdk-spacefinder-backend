import { handler } from '../services/node-lambda/listbuckets';

// Set a breakpoint in the lambda code and run this
test('Lambda Debug', () => {
    handler({}, {})
        .then(res => console.log(res));
})
