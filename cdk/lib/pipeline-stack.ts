import cdk = require('@aws-cdk/core');
import { App, Stack, StackProps, SecretValue } from '@aws-cdk/core';
import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');
import ssm = require("@aws-cdk/aws-ssm");
import { CdkStack } from './cdk-stack';


export interface PipelineStackProps extends StackProps {
    readonly webapp: CdkStack;
}

export class PipelineStack extends Stack{
    constructor(app: App, id: string, props: PipelineStackProps) {
        super(app, id, props);
        const webapp = props.webapp;
        const sourceOutput = new codepipeline.Artifact();
        const buildOutput = new codepipeline.Artifact();

        // Parameters to get the source code from GH
        const secret = cdk.SecretValue.secretsManager('/cdk-react-app-sample/prod', {jsonField:'GITHUB_TOKEN'});
        //const repo = ssm.StringParameter.valueForStringParameter(this, '/cdk-react-sample-app/prod/GITHUB_REPO');
        //const owner = ssm.StringParameter.valueForStringParameter(this, '/cdk-react-sample-app/prod/GITHUB_OWNER');
        const repo = cdk.SecretValue.secretsManager('/cdk-react-app-sample/prod', {jsonField:'GITHUB_REPO'}).toString();
        const owner = cdk.SecretValue.secretsManager('/cdk-react-app-sample/prod', {jsonField:'GITHUB_OWNER'}).toString();

        // Build project to build the app code
        const appBuildProject = new codebuild.PipelineProject(this, "AppBuildProject", {
            buildSpec: codebuild.BuildSpec.fromObject({
            version: "0.2",
            phases: {
                install: {
                    commands: [
                        "npm i"
                    ]
                },
                build: {
                    commands: "npm run build && ls -alh"
                }
            },
            artifacts: {
                "base-directory": ".",
                files: [
                "build/**/*",
                "node_modules/**/*",
                "@types"
                ]
            }
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_4_0
            }
        });

        // The pipeline
        new codepipeline.Pipeline(this, 'Pipeline', {
            restartExecutionOnUpdate: true,
            stages: [
              {
                stageName: 'Source',
                actions: [
                    new codepipeline_actions.GitHubSourceAction({
                        actionName: 'Github_Source',
                        owner: owner,
                        repo: repo,
                        oauthToken: secret,
                        output: sourceOutput,
                    }),
                ],
              },

              {
                stageName: 'Build',
                actions: [
                    new codepipeline_actions.CodeBuildAction({
                        actionName: 'App_Build',
                        project: appBuildProject,
                        input: sourceOutput,
                        outputs: [buildOutput],
                    }),
                ],
              },

              {
                stageName: 'Deploy',
                actions: [
                    new codepipeline_actions.S3DeployAction({
                        actionName: 'Deploy_to_S3',
                        input: buildOutput,
                        bucket: webapp.bucket
                    })
                ],
              },
              
            ],
          });
    }
}
