import PropTypes from 'prop-types';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { validateComponentProps } from '../src/lib/validateComponentProps';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('validateComponentProps', () => {
  test('runs PropTypes checks in development', () => {
    vi.stubEnv('DEV', true);
    const component = { name: 'Sample', propTypes: { title: PropTypes.string } };
    const check = vi.spyOn(PropTypes, 'checkPropTypes').mockImplementation(() => {});

    validateComponentProps(component, { title: 'Title' });

    expect(check).toHaveBeenCalledWith(component.propTypes, { title: 'Title' }, 'prop', 'Sample');
  });

  test('skips runtime PropTypes checks in production', () => {
    vi.stubEnv('DEV', false);
    const check = vi.spyOn(PropTypes, 'checkPropTypes').mockImplementation(() => {});

    validateComponentProps({ name: 'Sample', propTypes: {} }, {});

    expect(check).not.toHaveBeenCalled();
  });
});
