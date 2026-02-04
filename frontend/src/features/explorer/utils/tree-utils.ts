/**
 * Tree utilities for Explorer lazy loading
 * Handles merging children into the tree when folders are expanded
 */

import type { FileTreeNode } from '../file-system-adapter';

/**
 * Recursively merge loaded children into an existing tree at the target path
 * @param tree - Current tree root
 * @param targetPath - Path of folder whose children were loaded
 * @param newChildren - Loaded children to merge
 * @returns New tree with merged children
 */
export function mergeTreeChildren(
  tree: FileTreeNode,
  targetPath: string,
  newChildren: FileTreeNode[]
): FileTreeNode {
  // Found target - merge children
  if (tree.path === targetPath) {
    return {
      ...tree,
      children: newChildren,
      hasChildren: undefined, // Clear flag since children are now loaded
    };
  }

  // Not a directory or no children - return unchanged
  if (!tree.isDirectory || !tree.children) {
    return tree;
  }

  // Recursively search children
  return {
    ...tree,
    children: tree.children.map((child) =>
      child.isDirectory ? mergeTreeChildren(child, targetPath, newChildren) : child
    ),
  };
}
