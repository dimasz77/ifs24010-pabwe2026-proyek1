import PropTypes from 'prop-types';
import { isValidElement } from 'react';

function isRenderableNode(value) {
  if (value === null || value === undefined || ['string', 'number', 'bigint', 'boolean'].includes(typeof value)) {
    return true;
  }
  if (isValidElement(value)) return true;
  return Array.isArray(value) && value.every(isRenderableNode);
}

function createNodePropType(required) {
  return (props, propName, componentName, location, propFullName) => {
    const value = props[propName];
    if (value === null || value === undefined) {
      if (!required) return null;
      return new Error(`The ${location} \`${propFullName}\` is marked as required in \`${componentName}\`, but its value is \`${value}\`.`);
    }
    if (isRenderableNode(value)) return null;
    return new Error(`Invalid ${location} \`${propFullName}\` supplied to \`${componentName}\`.`);
  };
}

const nodePropType = createNodePropType(false);
nodePropType.isRequired = createNodePropType(true);

export const ReactNodePropType = nodePropType;

export function validateComponentProps(component, props) {
  PropTypes.checkPropTypes(component.propTypes, props, 'prop', component.name);
}
