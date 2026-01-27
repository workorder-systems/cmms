import { faker } from '@faker-js/faker';

export type UserRole = 'technician' | 'planner' | 'admin' | 'owner' | 'vendor';

// Counters for uniqueness across parallel tests
let tenantCounter = 0;
let userCounter = 0;

// Use process start time + counter to ensure uniqueness across test runs
const runId = Date.now();

function hashStringToSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  // limit to 32-bit signed int range faker expects
  return hash & 0x7fffffff;
}

export function seedFaker(seed: number | string): void {
  const numericSeed = typeof seed === 'string' ? hashStringToSeed(seed) : seed;
  faker.seed(numericSeed);
}

function domainForRole(role: UserRole): string {
  switch (role) {
    case 'technician':
      return 'northwindfm.com';
    case 'planner':
      return 'contoso-ops.com';
    case 'admin':
    case 'owner':
      return 'acme-industries.com';
    case 'vendor':
      return 'fabrikam-service.com';
    default:
      return 'northwindfm.com';
  }
}

export function makeUser(role: UserRole = 'technician'): {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
} {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const uid = `${runId}-${userCounter++}`;
  const localPart = `${firstName}.${lastName}.${uid}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

  const email = `${localPart}@${domainForRole(role)}`;

  return {
    email,
    password: 'StrongPassword!123',
    firstName,
    lastName,
    role,
  };
}

export function makeTenant(): { name: string; slug: string } {
  const companyName = `${faker.company.name()} Facilities Management`;
  
  // Create a valid slug: only lowercase alphanumeric, hyphens, underscores
  // Max 63 chars, min 2 chars
  const cleanedBase = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, '')       // Trim leading/trailing hyphens
    .substring(0, 40);             // Leave room for unique suffix

  // Use a short unique suffix (counter + last 6 digits of runId)
  const shortRunId = String(runId).slice(-6);
  const slug = `${cleanedBase}-${shortRunId}-${tenantCounter++}`;

  return {
    name: companyName,
    slug,
  };
}

export function makeLocationName(): string {
  const campus = faker.location.street();
  const buildingNumber = faker.number.int({ min: 1, max: 9 });
  return `Building ${buildingNumber} - ${campus}`;
}

export type LocationType = 'campus' | 'building' | 'floor' | 'room';

export function makeCampusName(): string {
  return faker.helpers.arrayElement([
    'Northwind Corporate Campus',
    'Contoso Industrial Park',
    'Acme Manufacturing Complex',
    'Fabrikam Business Center',
  ]);
}

export function makeBuildingName(): string {
  const buildingType = faker.helpers.arrayElement([
    'Headquarters',
    'Warehouse',
    'Data Center',
    'Production Facility',
    'Office Building',
    'Distribution Center',
  ]);
  const buildingLetter = faker.helpers.arrayElement(['A', 'B', 'C', '1', '2', '3']);
  return `Building ${buildingLetter} - ${buildingType}`;
}

export function makeFloorName(): string {
  const floorType = faker.helpers.arrayElement([
    'Floor',
    'Level',
    'Basement',
    'Mezzanine',
  ]);
  const floorNumber = faker.helpers.arrayElement([
    '1',
    '2',
    '3',
    '4',
    '5',
    'Ground',
    'Lower',
    'Upper',
  ]);
  return `${floorType} ${floorNumber}`;
}

export function makeRoomName(): string {
  const roomType = faker.helpers.arrayElement([
    'Room',
    'Suite',
    'Office',
    'Server Room',
    'Mechanical Room',
    'Electrical Room',
    'Storage',
    'Lab',
  ]);
  const roomNumber = faker.helpers.arrayElement([
    '101',
    '102',
    '201',
    '202',
    '301',
    'A',
    'B',
    'Main',
  ]);
  return `${roomType} ${roomNumber}`;
}

export function makeDepartmentName(): string {
  const base = faker.helpers.arrayElement([
    'Maintenance',
    'Reliability',
    'Production',
    'Facilities',
    'Engineering',
  ]);
  return `${base} Department`;
}

export function makeAssetName(): string {
  return faker.helpers.arrayElement([
    'Rooftop_Unit_05',
    'Pump_P-102',
    'Main_Electrical_Panel',
    'Air_Handler_AH-3',
    'Boiler_B-1',
  ]);
}

export type AssetCategory = 'hvac' | 'electrical' | 'plumbing' | 'fire_safety';

export function makeHVACAsset(): { name: string; assetNumber: string } {
  const types = [
    { prefix: 'RTU', name: 'Rooftop Unit' },
    { prefix: 'AHU', name: 'Air Handler Unit' },
    { prefix: 'CH', name: 'Chiller' },
    { prefix: 'VAV', name: 'Variable Air Volume' },
    { prefix: 'FCU', name: 'Fan Coil Unit' },
    { prefix: 'HP', name: 'Heat Pump' },
  ];
  const type = faker.helpers.arrayElement(types);
  const number = faker.number.int({ min: 1, max: 99 }).toString().padStart(3, '0');
  return {
    name: `${type.name} ${number}`,
    assetNumber: `${type.prefix}-${number}`,
  };
}

export function makeElectricalAsset(): { name: string; assetNumber: string } {
  const types = [
    { prefix: 'ELP', name: 'Electrical Panel' },
    { prefix: 'XFMR', name: 'Transformer' },
    { prefix: 'GEN', name: 'Generator' },
    { prefix: 'UPS', name: 'Uninterruptible Power Supply' },
    { prefix: 'SW', name: 'Switchgear' },
    { prefix: 'MCC', name: 'Motor Control Center' },
  ];
  const type = faker.helpers.arrayElement(types);
  const number = faker.number.int({ min: 1, max: 99 }).toString().padStart(3, '0');
  return {
    name: `${type.name} ${number}`,
    assetNumber: `${type.prefix}-${number}`,
  };
}

export function makePlumbingAsset(): { name: string; assetNumber: string } {
  const types = [
    { prefix: 'P', name: 'Pump' },
    { prefix: 'WH', name: 'Water Heater' },
    { prefix: 'BFP', name: 'Booster Pump' },
    { prefix: 'CW', name: 'Chilled Water Pump' },
    { prefix: 'CW', name: 'Condenser Water Pump' },
    { prefix: 'VLV', name: 'Control Valve' },
  ];
  const type = faker.helpers.arrayElement(types);
  const number = faker.number.int({ min: 1, max: 99 }).toString().padStart(3, '0');
  return {
    name: `${type.name} ${number}`,
    assetNumber: `${type.prefix}-${number}`,
  };
}

export function makeFireSafetyAsset(): { name: string; assetNumber: string } {
  const types = [
    { prefix: 'FA', name: 'Fire Alarm Panel' },
    { prefix: 'SPK', name: 'Sprinkler System' },
    { prefix: 'SMK', name: 'Smoke Detector' },
    { prefix: 'EXT', name: 'Fire Extinguisher' },
    { prefix: 'HD', name: 'Fire Hydrant' },
  ];
  const type = faker.helpers.arrayElement(types);
  const number = faker.number.int({ min: 1, max: 99 }).toString().padStart(3, '0');
  return {
    name: `${type.name} ${number}`,
    assetNumber: `${type.prefix}-${number}`,
  };
}

export function makeAssetByCategory(category: AssetCategory): { name: string; assetNumber: string } {
  switch (category) {
    case 'hvac':
      return makeHVACAsset();
    case 'electrical':
      return makeElectricalAsset();
    case 'plumbing':
      return makePlumbingAsset();
    case 'fire_safety':
      return makeFireSafetyAsset();
  }
}

export function makeAssetNumber(): string {
  const prefix = faker.helpers.arrayElement(['RTU', 'P', 'AH', 'ELP', 'BLR']);
  const number = faker.number.int({ min: 1, max: 999 }).toString().padStart(3, '0');
  return `${prefix}-${number}`;
}

export function makeWorkOrderTitle(assetName?: string): string {
  const action = faker.helpers.arrayElement([
    'Investigate vibration on',
    'Perform preventive maintenance for',
    'Repair leak on',
    'Inspect electrical connections for',
    'Replace filters on',
  ]);

  const target = assetName ?? makeAssetName();
  return `${action} ${target}`;
}

export type WorkOrderType = 'pm' | 'corrective' | 'emergency';

export function makePreventiveMaintenanceTitle(assetName?: string): string {
  const actions = [
    `Quarterly filter replacement - ${assetName ?? 'equipment'}`,
    `Monthly inspection - ${assetName ?? 'equipment'}`,
    `Annual service - ${assetName ?? 'equipment'}`,
    `Semi-annual calibration - ${assetName ?? 'equipment'}`,
    `Quarterly lubrication - ${assetName ?? 'equipment'}`,
    `Monthly belt inspection - ${assetName ?? 'equipment'}`,
  ];
  return faker.helpers.arrayElement(actions);
}

export function makeCorrectiveMaintenanceTitle(assetName?: string): string {
  const actions = [
    `Repair refrigerant leak on ${assetName ?? 'equipment'}`,
    `Fix electrical fault - ${assetName ?? 'equipment'}`,
    `Replace failed component on ${assetName ?? 'equipment'}`,
    `Investigate unusual noise from ${assetName ?? 'equipment'}`,
    `Repair water leak on ${assetName ?? 'equipment'}`,
    `Troubleshoot control system - ${assetName ?? 'equipment'}`,
    `Fix vibration issue - ${assetName ?? 'equipment'}`,
  ];
  return faker.helpers.arrayElement(actions);
}

export function makeEmergencyMaintenanceTitle(locationName?: string): string {
  const emergencies = [
    `No cooling in ${locationName ?? 'critical area'} - Critical`,
    `Power outage - ${locationName ?? 'building'}`,
    `Water leak emergency - ${locationName ?? 'area'}`,
    `Fire alarm activation - ${locationName ?? 'building'}`,
    `Equipment failure - ${locationName ?? 'critical system'}`,
    `HVAC system down - ${locationName ?? 'server room'}`,
  ];
  return faker.helpers.arrayElement(emergencies);
}

export function makeWorkOrderDescription(type: WorkOrderType, assetName?: string, locationName?: string): string {
  const descriptions = {
    pm: [
      `Routine preventive maintenance task. Follow standard PM checklist for ${assetName ?? 'equipment'}.`,
      `Scheduled maintenance per manufacturer recommendations.`,
      `Regular service interval maintenance. Document all findings.`,
    ],
    corrective: [
      `Corrective maintenance required. Issue reported: ${faker.helpers.arrayElement(['vibration', 'unusual noise', 'performance degradation', 'leak detected'])}.`,
      `Repair work order. Troubleshoot and resolve issue with ${assetName ?? 'equipment'}.`,
      `Non-routine maintenance. Investigate root cause and implement fix.`,
    ],
    emergency: [
      `URGENT: Immediate attention required. System failure affecting operations.`,
      `Emergency response needed. Critical system down at ${locationName ?? 'location'}.`,
      `Priority 1 emergency. Dispatch immediately to ${locationName ?? 'site'}.`,
    ],
  };
  return faker.helpers.arrayElement(descriptions[type]);
}

