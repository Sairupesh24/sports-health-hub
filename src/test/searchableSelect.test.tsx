import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchableSelect } from '@/components/ui/searchable-select';

describe('SearchableSelect Component', () => {
  const options = [
    { value: 'all', label: 'All Clients (3)' },
    { value: 'c1', label: 'Mr. Priyanshu Rajawat', sublabel: '(CSH05250028)' },
    { value: 'c2', label: 'Mr. Pranit Somani', sublabel: '(CSH04250004)' },
    { value: 'c3', label: 'Ms. Tanisha Crasto', sublabel: '(CSH04250048)' },
  ];

  it('renders with placeholder or selected option label', () => {
    const { rerender } = render(
      <SearchableSelect
        value="all"
        onValueChange={vi.fn()}
        options={options}
        placeholder="Select Client"
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('All Clients (3)');

    rerender(
      <SearchableSelect
        value="c1"
        onValueChange={vi.fn()}
        options={options}
        placeholder="Select Client"
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Mr. Priyanshu Rajawat (CSH05250028)');
  });

  it('opens and filters options as the user types in the search bar', async () => {
    const handleChange = vi.fn();
    render(
      <SearchableSelect
        value="all"
        onValueChange={handleChange}
        options={options}
        searchPlaceholder="Search client by name or UHID..."
      />
    );

    // Open dropdown
    fireEvent.click(screen.getByRole('combobox'));

    // Verify search input is rendered
    const searchInput = await screen.findByPlaceholderText('Search client by name or UHID...');
    expect(searchInput).toBeInTheDocument();

    // Type "tanisha" to filter
    fireEvent.change(searchInput, { target: { value: 'tanisha' } });

    // "Ms. Tanisha Crasto" should be visible, others should not
    expect(screen.getByText('Ms. Tanisha Crasto')).toBeInTheDocument();
    expect(screen.queryByText('Mr. Priyanshu Rajawat')).not.toBeInTheDocument();

    // Click option to select
    fireEvent.click(screen.getByText('Ms. Tanisha Crasto'));
    expect(handleChange).toHaveBeenCalledWith('c3');
  });

  it('filters by UHID sublabel', async () => {
    render(
      <SearchableSelect
        value="all"
        onValueChange={vi.fn()}
        options={options}
        searchPlaceholder="Search..."
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    const searchInput = await screen.findByPlaceholderText('Search...');

    // Type UHID "0525"
    fireEvent.change(searchInput, { target: { value: '0525' } });

    expect(screen.getByText('Mr. Priyanshu Rajawat')).toBeInTheDocument();
    expect(screen.queryByText('Ms. Tanisha Crasto')).not.toBeInTheDocument();
  });

  it('displays empty message when no matches found', async () => {
    render(
      <SearchableSelect
        value="all"
        onValueChange={vi.fn()}
        options={options}
        searchPlaceholder="Search..."
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    const searchInput = await screen.findByPlaceholderText('Search...');

    fireEvent.change(searchInput, { target: { value: 'NonExistentClient' } });
    expect(screen.getByText(/No results found for/i)).toBeInTheDocument();
  });
});

