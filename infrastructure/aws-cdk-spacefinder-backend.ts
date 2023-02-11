#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsCdkSpacefinderBackendStack } from './aws-cdk-spacefinder-backend-stack';

const app = new cdk.App();
new AwsCdkSpacefinderBackendStack(app, 'SpacefinderBackendStack', {});
