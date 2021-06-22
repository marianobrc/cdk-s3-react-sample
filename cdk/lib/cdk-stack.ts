import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Deploy from '@aws-cdk/aws-s3-deployment';
import * as cloudfront from '@aws-cdk/aws-cloudfront';

export class CdkStack extends cdk.Stack {
  public bucket: s3.Bucket;
  public cloudfrontDistro: cloudfront.CloudFrontWebDistribution;
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3
    this.bucket = new s3.Bucket(this, "SampleReactAppBucket", {
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      websiteIndexDocument: "index.html"
    });

    // Enable CORS for any origin
    const cfnBucket = this.bucket.node.findChild("Resource") as s3.CfnBucket;
    cfnBucket.addPropertyOverride("CorsConfiguration", {
      CorsRules: [
        {
          AllowedOrigins: ["*"],
          AllowedMethods: ["HEAD", "GET", "PUT", "POST", "DELETE"],
          ExposedHeaders: [
            "x-amz-server-side-encryption",
            "x-amz-request-id",
            "x-amz-id-2"
          ],
          AllowedHeaders: ["*"]
        }
      ]
    });

    // Deployment
    const src = new s3Deploy.BucketDeployment(this, "DeploySampleReactApp", {
      sources: [s3Deploy.Source.asset("../build")],
      destinationBucket: this.bucket
    });

    // Cloudfront
    this.cloudfrontDistro = new cloudfront.CloudFrontWebDistribution(this, "SampleReactAppCloudfrontDistribution", {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: this.bucket
          },
          behaviors: [{isDefaultBehavior: true}]
        },
      ]
    });
  }
}
