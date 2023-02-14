import * as cdk from 'aws-cdk-lib';
import { CfnOutput, Fn } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdanodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { join } from 'path';
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import { AuthorizationType } from 'aws-cdk-lib/aws-apigateway'
import { GenericTable } from './GenericTable';
import * as iam from 'aws-cdk-lib/aws-iam'
import { AuthorizerWrapper } from './auth/AuthorizerWrapper';
import { Bucket, HttpMethods } from 'aws-cdk-lib/aws-s3';


export class AwsCdkSpacefinderBackendStack extends cdk.Stack {
    private api = new apigw.RestApi(this, 'SpaceApi');
    private spacesTable = new GenericTable(this, {
        tableName: 'SpacesTable',
        primaryKey: 'spaceId',
        createLambdaPath: 'Create',
        readLambdaPath: 'Read',
        secondaryIndexes: ['location'],
        updateLambdaPath: 'Update',
        deleteLambdaPath: 'Delete'
    });
    private authorizer: AuthorizerWrapper;
    private bucketSuffix = this.createBucketSuffix();

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.authorizer = new AuthorizerWrapper(this, this.api);

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
        helloLambdaResource.addMethod('GET', helloLambdaIntegration, {
            authorizationType: AuthorizationType.COGNITO,
            authorizer: {
                authorizerId: this.authorizer.authorizer.authorizerId
            }
        });

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

        // ----------------------
        // S3 Bucket
        // ----------------------
        const spacesPhotosBucket = new Bucket(this, 'spaces-photos', {
            bucketName: 'spaces-photos-' + this.bucketSuffix,
            cors: [{
                allowedMethods: [
                    HttpMethods.HEAD,
                    HttpMethods.GET,
                    HttpMethods.PUT,
                ],
                allowedOrigins: ['*'],
                allowedHeaders: ['*']
            }]
        });

        new CfnOutput(this, 'spaces-photos-bucket-name', {
            value: spacesPhotosBucket.bucketName
        })
    }

    // Fn: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Fn.html
    // stackId = arn:aws:cloudformation:eu-central-1:585098453895:stack/SpacefinderBackendStack/13ba1630-a9e9-11ed-87f5-0a51afce4fc6
    private createBucketSuffix(): string {
        // shortStackId = 13ba1630-a9e9-11ed-87f5-0a51afce4fc6
        const shortStackId = Fn.select(2, Fn.split('/', this.stackId));
        // suffix = 0a51afce4fc6
        const suffix = Fn.select(4, Fn.split('-', shortStackId));
        return suffix;
    }
}
