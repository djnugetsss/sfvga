import { fireEvent, render, screen } from '@testing-library/react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

describe('SearchableSelect', () => {
  const options = [
    { value: 'one', label: 'Asha Patel', description: '+1 818-555-0101' },
    { value: 'two', label: 'Rohan Shah', description: '+1 818-555-0102' },
  ];

  it('filters members inside the dropdown and selects the matching member', () => {
    const onChange = jest.fn();
    render(
      <SearchableSelect
        label="Member"
        value=""
        options={options}
        onChange={onChange}
        searchPlaceholder="Search members…"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select an option…' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search members…' }), {
      target: { value: 'Rohan' },
    });

    expect(screen.queryByRole('option', { name: /Asha Patel/ })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: /Rohan Shah/ }));
    expect(onChange).toHaveBeenCalledWith('two');
  });

  it('matches a member by phone number', () => {
    render(
      <SearchableSelect
        label="Member"
        value=""
        options={options}
        onChange={jest.fn()}
        searchPlaceholder="Search members…"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select an option…' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search members…' }), {
      target: { value: '0101' },
    });

    expect(screen.getByRole('option', { name: /Asha Patel/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Rohan Shah/ })).toBeNull();
  });
});
