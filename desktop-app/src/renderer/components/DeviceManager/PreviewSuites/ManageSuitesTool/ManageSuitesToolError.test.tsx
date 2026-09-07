import {render, screen, fireEvent} from '@testing-library/react';
import {ManageSuitesToolError} from './ManageSuitesToolError';

describe('ManageSuitesToolError', () => {
  it('renders the error message and close button', () => {
    const onClose = vi.fn();
    render(<ManageSuitesToolError onClose={onClose} />);

    expect(screen.getByText('发生错误，请重试。')).toBeInTheDocument();
    expect(screen.getByText('关闭')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<ManageSuitesToolError onClose={onClose} />);

    fireEvent.click(screen.getByText('关闭'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
