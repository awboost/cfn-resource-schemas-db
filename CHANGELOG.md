# Changelog

## v0.1.10

- added `AWS::Backup::RestoreTestingPlan`
- added `AWS::Backup::RestoreTestingSelection`
- added `AWS::CodeStarConnections::RepositoryLink`
- added `AWS::CodeStarConnections::SyncConfiguration`
- added `AWS::ControlTower::LandingZone`
- added `AWS::EKS::PodIdentityAssociation`
- added `AWS::ElastiCache::ServerlessCache`
- added `AWS::ElasticLoadBalancingV2::TrustStore`
- added `AWS::ElasticLoadBalancingV2::TrustStoreRevocation`
- added `AWS::Logs::Delivery`
- added `AWS::Logs::DeliveryDestination`
- added `AWS::Logs::DeliverySource`
- added `AWS::Logs::LogAnomalyDetector`
- added `AWS::S3Express::BucketPolicy`
- added `AWS::S3Express::DirectoryBucket`
- added `AWS::SageMaker::InferenceComponent`
- updated `AWS::AccessAnalyzer::Analyzer`
  - added definition `UnusedAccessConfiguration`
  - added property `AnalyzerConfiguration`
  - updated `createOnlyProperties`
  - updated property `Type`
- updated `AWS::ControlTower::EnabledControl`
  - added definition `EnabledControlParameter`
  - added property `Parameters`
- updated `AWS::EC2::TransitGateway`
  - removed property `SecurityGroupReferencingSupport`
- updated `AWS::EC2::TransitGatewayVpcAttachment`
  - updated property `Options`
- updated `AWS::EFS::FileSystem`
  - added definition `FileSystemProtection`
  - added property `FileSystemProtection`
  - updated `propertyTransform`
  - updated definition `LifecyclePolicy`
  - updated handler permissions
- updated `AWS::ElasticLoadBalancingV2::Listener`
  - added definition `MutualAuthentication`
  - added property `MutualAuthentication`
- updated `AWS::Logs::LogGroup`
  - added property `LogGroupClass`
- updated `AWS::ManagedBlockchain::Accessor`
  - added definition `NetworkAccessorType`
  - added property `NetworkType`
  - updated `createOnlyProperties`
- updated `AWS::OpenSearchServerless::Collection`
  - added definition `StandbyReplicas`
  - added property `StandbyReplicas`