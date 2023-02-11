import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { AttributeType } from 'aws-cdk-lib/aws-dynamodb'
import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { join } from 'path';

export interface TableProps {
    tableName: string,
    primaryKey: string,
    createLambdaPath?: string,
    readLambdaPath?: string,
    updateLambdaPath?: string,
    deleteLambdaPath?: string,
    secondaryIndexes?: string[]
}

export class GenericTable {
    private stack: Stack;
    private props: TableProps;
    private table: dynamodb.Table;

    private createLambda: NodejsFunction | undefined;
    private readLambda: NodejsFunction | undefined;
    private updateLambda: NodejsFunction | undefined;
    private deleteLambda: NodejsFunction | undefined;

    public createLambdaIntegration: apigw.LambdaIntegration;
    public readLambdaIntegration: apigw.LambdaIntegration;
    public updateLambdaIntegration: apigw.LambdaIntegration;
    public deleteLambdaIntegration: apigw.LambdaIntegration;

    constructor(stack: Stack, props: TableProps) {
        this.stack = stack;
        this.props = props;
        this.initialize();
    }

    private initialize() {
        this.createTable();
        this.addSecondaryIndexes();
        this.createLambdas();
        this.grantTableRights();
    }

    private createTable() {
        this.table = new dynamodb.Table(this.stack, this.props.tableName, {
            tableName: this.props.tableName,
            partitionKey: {
                name: this.props.primaryKey,
                type: AttributeType.STRING
            },
            removalPolicy: RemovalPolicy.DESTROY,
        });
    }

    private addSecondaryIndexes() {
        // GSI allow to query for fields other than Primary Key
        if (this.props.secondaryIndexes) {
            for (const secondaryIndex of this.props.secondaryIndexes) {
                this.table.addGlobalSecondaryIndex({
                    indexName: secondaryIndex,
                    partitionKey: {
                        name: secondaryIndex,
                        type: AttributeType.STRING
                    }
                })
            }
        }
    }

    private createLambdas() {
        if (this.props.createLambdaPath) {
            this.createLambda = this.createSingleLambda(this.props.createLambdaPath);
            this.createLambdaIntegration = new LambdaIntegration(this.createLambda);
        }
        if (this.props.readLambdaPath) {
            this.readLambda = this.createSingleLambda(this.props.readLambdaPath);
            this.readLambdaIntegration = new LambdaIntegration(this.readLambda);
        }
        if (this.props.updateLambdaPath) {
            this.updateLambda = this.createSingleLambda(this.props.updateLambdaPath);
            this.updateLambdaIntegration = new LambdaIntegration(this.updateLambda);
        }
        if (this.props.deleteLambdaPath) {
            this.deleteLambda = this.createSingleLambda(this.props.deleteLambdaPath);
            this.deleteLambdaIntegration = new LambdaIntegration(this.deleteLambda);
        }
    }

    private createSingleLambda(lambdaName: string): NodejsFunction {
        const lambdaId = `${this.props.tableName}-${lambdaName}`;
        return new NodejsFunction(this.stack, lambdaId, {
            entry: (join(__dirname, '..', 'services', 'spaces-table', `${lambdaName}.ts`)),
            handler: 'handler',
            functionName: lambdaId,
            environment: {
                TABLE_NAME: this.props.tableName,
                PRIMARY_KEY: this.props.primaryKey
            }
        })
    }

    private grantTableRights() {
        if (this.createLambda) {
            this.table.grantWriteData(this.createLambda);
        }
        if (this.readLambda) {
            this.table.grantReadData(this.readLambda);
        }
        if (this.updateLambda) {
            this.table.grantWriteData(this.updateLambda);
        }
        if (this.deleteLambda) {
            this.table.grantWriteData(this.deleteLambda);
        }
    }
}
