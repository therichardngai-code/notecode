import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileAttachmentList } from '../file-attachment-list';

describe('FileAttachmentList', () => {
  it('returns null when no files attached', () => {
    const { container } = render(
      <FileAttachmentList attachedFiles={[]} onRemoveFile={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders single attached file', () => {
    render(
      <FileAttachmentList
        attachedFiles={['/src/index.ts']}
        onRemoveFile={vi.fn()}
      />
    );
    expect(screen.getByText('/src/index.ts')).toBeInTheDocument();
  });

  it('renders multiple attached files', () => {
    render(
      <FileAttachmentList
        attachedFiles={['/src/index.ts', '/src/app.tsx', '/package.json']}
        onRemoveFile={vi.fn()}
      />
    );
    expect(screen.getByText('/src/index.ts')).toBeInTheDocument();
    expect(screen.getByText('/src/app.tsx')).toBeInTheDocument();
    expect(screen.getByText('/package.json')).toBeInTheDocument();
  });

  it('calls onRemoveFile with correct index when X clicked', () => {
    const onRemoveFile = vi.fn();
    render(
      <FileAttachmentList
        attachedFiles={['/file1.ts', '/file2.ts', '/file3.ts']}
        onRemoveFile={onRemoveFile}
      />
    );

    // Get all remove buttons (X icons)
    const removeButtons = screen.getAllByRole('button');

    // Click second file's remove button
    fireEvent.click(removeButtons[1]);
    expect(onRemoveFile).toHaveBeenCalledWith(1);
  });

  it('calls onRemoveFile for first file', () => {
    const onRemoveFile = vi.fn();
    render(
      <FileAttachmentList
        attachedFiles={['/first.ts', '/second.ts']}
        onRemoveFile={onRemoveFile}
      />
    );

    const removeButtons = screen.getAllByRole('button');
    fireEvent.click(removeButtons[0]);
    expect(onRemoveFile).toHaveBeenCalledWith(0);
  });

  it('truncates long file names', () => {
    const { container } = render(
      <FileAttachmentList
        attachedFiles={['/very/long/path/to/some/deeply/nested/file.ts']}
        onRemoveFile={vi.fn()}
      />
    );

    const truncatedSpan = container.querySelector('.truncate');
    expect(truncatedSpan).toBeInTheDocument();
  });
});
