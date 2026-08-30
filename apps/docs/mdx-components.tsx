import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { ComponentDemo } from './components/component-demo';
import { FormDemo } from './components/form-demo';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return { ...defaultComponents, ComponentDemo, FormDemo, ...components };
}
