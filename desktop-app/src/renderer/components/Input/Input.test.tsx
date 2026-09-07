import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import Input from './index';

describe('Input accessible Chinese labels', () => {
  it('associates a localized label with the caller-provided id', () => {
    render(<Input label="书签名称" id="bookmark-name" />);
    expect(screen.getByLabelText('书签名称')).toHaveAttribute('id', 'bookmark-name');
  });
  it('generates a label association when no id is provided', () => {
    render(<Input label="用户名" />);
    expect(screen.getByLabelText('用户名')).toHaveAttribute('id');
  });
});
