// shared helper utilities

// chunking for batching nerdgraph calls
export const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

// strip special domain tags added
export const simpleEntityType = entityType => {
  switch (entityType) {
    case 'INFRASTRUCTURE_HOST_ENTITY':
      return 'HOSTS';
    case 'APM_APPLICATION_ENTITY':
      return 'APPS';
    case 'MOBILE_APPLICATION_ENTITY':
      return 'MOBILE APPS';
    case 'GENERIC_INFRASTRUCTURE_ENTITY':
      return 'GENERIC INFRA';
    case 'INFRASTRUCTURE_AWS_LAMBDA_FUNCTION_ENTITY':
      return 'AWS LAMBDA';
    case 'VSPHEREVM':
      return 'VSPHERE VMS';
    default:
      entityType = entityType
        .replace('_ENTITY', '')
        .replace('APPLICATIONS', 'APPS')
        .replace('INFRASTRUCTURE', 'INFRA');
      return `${entityType}S`.replace(/_/g, ' ');
  }
};
