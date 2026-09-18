import { describe, expect, it } from 'vitest';
import {
  describeCanOnlyDependOn,
  matchesCanOnlyDependOn,
} from '../../src/core/rules/can-only-depend-on.rule.js';
import {
  describeCannotDependOn,
  matchesCannotDependOn,
} from '../../src/core/rules/cannot-depend-on.rule.js';

describe('cannotDependOn', () => {
  const rule = { from: 'domain', cannotDependOn: ['infrastructure', 'cli'] };

  it('matches a layer on the forbidden list', () => {
    expect(matchesCannotDependOn(rule, 'infrastructure')).toBe(true);
    expect(matchesCannotDependOn(rule, 'cli')).toBe(true);
  });

  it('ignores a layer that is not listed', () => {
    expect(matchesCannotDependOn(rule, 'application')).toBe(false);
  });

  // A rule carrying the other kind of list must not answer for this one.
  it('never matches a rule without a cannotDependOn list', () => {
    expect(
      matchesCannotDependOn({ from: 'domain', canOnlyDependOn: ['domain'] }, 'cli'),
    ).toBe(false);
  });

  it('describes the pair it rejected', () => {
    expect(describeCannotDependOn(rule, 'infrastructure')).toBe(
      'domain cannot depend on infrastructure',
    );
  });
});

describe('canOnlyDependOn', () => {
  const rule = { from: 'application', canOnlyDependOn: ['domain'] };

  // The inverted one. It matches everything the list leaves out, so the
  // absence of a list has to mean the rule stays silent rather than rejecting
  // every layer there is.
  it('matches a layer the list leaves out', () => {
    expect(matchesCanOnlyDependOn(rule, 'infrastructure')).toBe(true);
  });

  it('allows a layer on the list', () => {
    expect(matchesCanOnlyDependOn(rule, 'domain')).toBe(false);
  });

  it('never matches a rule without a canOnlyDependOn list', () => {
    expect(
      matchesCanOnlyDependOn(
        { from: 'application', cannotDependOn: ['infrastructure'] },
        'infrastructure',
      ),
    ).toBe(false);
  });

  it('names both what was allowed and what was found', () => {
    expect(
      describeCanOnlyDependOn(
        { from: 'application', canOnlyDependOn: ['domain', 'shared'] },
        'infrastructure',
      ),
    ).toBe('application can only depend on domain, shared (not infrastructure)');
  });
});
