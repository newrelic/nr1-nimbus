## Dependencies

Nimbus works off your existing New Relic account data, using New Relic Workloads to model and track the entities in your pre and post migration contexts. To get the most out of Nimbus you will want to capture as much comparative telemetry from your pre and post migration workloads as possible. This means Infrastructure, APM, Browser, Synthetics, and [Cloud Integration](https://docs.newrelic.com/docs/integrations/infrastructure-integrations/cloud-integrations) Entities. 

If you don't have New Relic Agents installed and want to get going quickly, you can use [New Relic's VMware vSphere Integration](https://docs.newrelic.com/docs/integrations/host-integrations/host-integrations-list/vmware-vsphere-monitoring-integration), this allows you to use vSphere to collect performance KPIs on your VM assets and represent them in pre-migration workloads.   


## Getting started

1. Add Nimbus to your New Relic accounts with the [New Relic Catalog](http://newrelic.com). You can do this by finding the Nimbus App in the New Relic One catalog. Just click on the app and select the accounts you want to grant access to via the Manage Access feature.


2. Ensure you have all the data you need to compare workloads. The more telemetry you are acquiring from your legacy system the better the position you will be in to compare and contrast how your services operate in the cloud. 

> 2.1 Install New Relic Infrastructure and Application Runtime Agents in your legacy environment
> 
> New Relic Agents provide telemetry allowing you to understand your non-cloud workload performance and capacity KPIs allowing you to make informed decisions for the resource allocation and performance expectations of your migrated services.   

> 2.2 Install the [New Relic vSphere Infrastructure Integration](https://docs.newrelic.com/docs/integrations/host-integrations/host-integrations-list/vmware-vsphere-monitoring-integration)  
> 
> If your legacy services are running in Virtual Machines managed by vSphere, you can gather operational KPIs directly from vSphere and use those metrics to understand the performance and capacity constraints of your legacy systems. If you choose this method, take a look at the "Create Workloads from vSphere Networks" section below to get started.  

> 2.3 Ensure [New Relic Cloud Integrations](https://docs.newrelic.com/docs/integrations/infrastructure-integrations/cloud-integrations) are enabled

> This will allow your migration target workloads to keep track of your Cloud services usage, and how those dependencies affect your migrated services.  