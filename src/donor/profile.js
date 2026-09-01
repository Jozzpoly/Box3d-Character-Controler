export const DONOR_PROFILE_V0 = Object.freeze({
  radius: 0.36,
  halfSegment: 0.54,
  virtualMass: 80,
  maxSpeed: 5.2,
  sprintMultiplier: 1.32,
  groundAcceleration: 31,
  groundDeceleration: 36,
  airAcceleration: 7.5,
  airDeceleration: 1.2,
  externalGroundDrag: 2.0,
  externalAirDrag: 0.22,
  gravity: 20.0,
  fallGravityMultiplier: 1.22,
  jumpReleaseGravityMultiplier: 1.75,
  jumpSpeed: 7.2,
  coyoteTime: 0.11,
  jumpBufferTime: 0.12,
  supportNormalMinY: 0.58,
});

export const DONOR_QUALIFIED_ENVELOPE_V0 = Object.freeze({
  fixedDt: 1 / 60,
  substeps: 4,
  box3dBinding: 'box3d.js@0.1.1',
  mechanicsSourceStage: 'E2.3',
  mechanicsBaselineCommit: '02d3528cae47f4b04f594dda4ed0a66727033edd',
});

// Donor v1 intentionally keeps every qualified feel constant from v0.
// Its new identity is semantic: E2.3d constraint velocity ownership.
export const DONOR_PROFILE_V1 = Object.freeze({ ...DONOR_PROFILE_V0 });

export const DONOR_QUALIFIED_ENVELOPE_V1 = Object.freeze({
  fixedDt: 1 / 60,
  substeps: 4,
  box3dBinding: 'box3d.js@0.1.1',
  mechanicsSourceStage: 'E2.3d Owner-qualified A‴',
  mechanicsBaselineCommit: 'bc06ca98e94314af0ba888b74e1c4029429422e5',
});
