import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { ComponentDemo } from './components/component-demo';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return { ...defaultComponents, ComponentDemo, ...components };
}
