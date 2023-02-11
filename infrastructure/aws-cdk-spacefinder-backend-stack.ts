import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdanodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { join } from 'path';
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import { GenericTable } from './GenericTable';
import * as iam from 'aws-cdk-lib/aws-iam'


export class AwsCdkSpacefinderBackendStack extends cdk.Stack {
    private api = new apigw.RestApi(this, 'SpaceApi')
    private spacesTable = new GenericTable(this, {
        tableName: 'SpacesTable',
        primaryKey: 'spaceId',
        createLambdaPath: 'Create',
        readLambdaPath: 'Read',
        secondaryIndexes: ['location'],
        updateLambdaPath: 'Update',
        deleteLambdaPath: 'Delete'
    })

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // ----------------------
        // JS Lambda with API
        // ----------------------
        const helloLambda = new lambda.Function(this, 'helloLambda', {
            runtime: lambda.Runtime.NODEJS_18_X,
            code: lambda.Code.fromAsset(join(__dirname, '..', 'services', 'hello-lambda')),
            handler: 'hello.main'
        });

        const helloLambdaIntegration = new apigw.LambdaIntegration(helloLambda);
        const helloLambdaResource = this.api.root.addResource('hello');
        helloLambdaResource.addMethod('GET', helloLambdaIntegration);

        // ----------------------
        // Typescript Lambda
        // ----------------------
        const helloLambdaNodejs = new lambdanodejs.NodejsFunction(this, 'helloLambdaNodejs', {
            entry: join(__dirname, '..', 'services', 'node-lambda', 'hello.ts'),
            handler: 'handler'
        })

        // ----------------------
        // Lambda with access to S3
        // ----------------------
        const listbucketsLambda = new lambdanodejs.NodejsFunction(this, 'listbucketsLambda', {
            entry: join(__dirname, '..', 'services', 'node-lambda', 'listbuckets.ts'),
            handler: 'handler'
        })

        const s3ListPolicy = new iam.PolicyStatement();
        s3ListPolicy.addActions('s3:ListAllMyBuckets');
        s3ListPolicy.addResources('*');
        listbucketsLambda.addToRolePolicy(s3ListPolicy);

        const listbucketsLambdaIntegration = new apigw.LambdaIntegration(listbucketsLambda);
        const listbucketsLambdaResource = this.api.root.addResource('buckets');
        listbucketsLambdaResource.addMethod('GET', listbucketsLambdaIntegration)

        // ----------------------
        // Lambda with access to DynamoDB
        // ----------------------
        // Create item
        //      Test using API Tester:
        //      POST {{api_url}}/spaces
        //      Body: {"location": "London","name": "Best location"}
        // Query
        //      GET {{api_url}}/spaces (=>FindAll)
        //      GET {{api_url}}/spaces?spaceId=sdsfree1434e (=>FindById)
        //      GET {{api_url}}/spaces?location=London (=>FindBy, throws error if param is not an index)
        // Update
        //      PUT {{api_url}}/spaces?spaceId=sdsfree1434e
        //      Body: {"location": "Bern","name": "Updated"}
        // Delete
        //      DELETE {{api_url}}/spaces?spaceId=sdsfree1434e
        const spacesResource = this.api.root.addResource('spaces');
        spacesResource.addMethod('POST', this.spacesTable.createLambdaIntegration);
        spacesResource.addMethod('GET', this.spacesTable.readLambdaIntegration);
        spacesResource.addMethod('PUT', this.spacesTable.updateLambdaIntegration);
        spacesResource.addMethod('DELETE', this.spacesTable.deleteLambdaIntegration);
    }
}
