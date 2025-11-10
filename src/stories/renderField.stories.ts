import { renderField } from '../components/forms/renderField';

export default {
  title: 'Renderers/Field',
  tags: ['autodocs'],
  render: ({ ...args }) => {
    const { field } = renderField(args);
    field.style.maxWidth = '400px';
    field.style.margin = '20px';
    return field;
  }
};

/**
 * Basic text input field
 */
export const TextInput = {
  args: {
    label: 'Username',
    field: 'username',
    placeholder: 'Enter your username',
    type: 'text'
  }
};

/**
 * Password field with icon
 */
export const PasswordField = {
  args: {
    label: 'Password',
    field: 'password',
    type: 'password',
    placeholder: 'Enter password',
    iconRight: 'fas fa-eye'
  }
};

/**
 * Email field with left icon
 */
export const EmailField = {
  args: {
    label: 'Email Address',
    field: 'email',
    type: 'email',
    placeholder: 'user@example.com',
    iconLeft: 'fas fa-envelope'
  }
};

/**
 * Number input field
 */
export const NumberField = {
  args: {
    label: 'Age',
    field: 'age',
    type: 'number',
    placeholder: '18',
    value: '25'
  }
};

/**
 * Select dropdown with options
 */
export const SelectDropdown = {
  args: {
    label: 'Country',
    field: 'country',
    options: [
      { label: 'Select a country...', value: '', disabled: true, selected: true },
      { label: 'United States', value: 'USA' },
      { label: 'United Kingdom', value: 'GBR' },
      { label: 'France', value: 'FRA' },
      { label: 'Spain', value: 'ESP' },
      { label: 'Germany', value: 'GER' }
    ]
  }
};

/**
 * Multi-select dropdown
 */
export const MultiSelect = {
  args: {
    label: 'Select Sports',
    field: 'sports',
    multiple: true,
    options: [
      { label: 'Tennis', value: 'tennis' },
      { label: 'Basketball', value: 'basketball', selected: true },
      { label: 'Soccer', value: 'soccer' },
      { label: 'Swimming', value: 'swimming', selected: true },
      { label: 'Running', value: 'running' }
    ]
  }
};

/**
 * Checkbox field
 */
export const Checkbox = {
  args: {
    label: 'I agree to the terms and conditions',
    field: 'agree',
    id: 'agreeCheckbox',
    checkbox: true,
    checked: false,
    intent: 'is-success'
  }
};

/**
 * Checked checkbox with custom color
 */
export const CheckedCheckbox = {
  args: {
    label: 'Remember me',
    field: 'remember',
    id: 'rememberCheckbox',
    checkbox: true,
    checked: true,
    intent: 'is-info',
    color: '#4a90e2'
  }
};

/**
 * Radio button group
 */
export const RadioGroup = {
  args: {
    radio: true,
    id: 'gender',
    label: 'Gender',
    options: [
      { text: 'Male', checked: true },
      { text: 'Female', checked: false },
      { text: 'Other', checked: false }
    ]
  }
};

/**
 * Text field with validation
 */
export const WithValidation = {
  args: {
    label: 'Username (min 5 characters)',
    field: 'username',
    placeholder: 'Enter username',
    validator: (value: string) => value.length >= 5,
    error: 'Username must be at least 5 characters'
  }
};

/**
 * Email validation field
 */
export const EmailValidation = {
  args: {
    label: 'Email Address',
    field: 'email',
    type: 'email',
    placeholder: 'user@example.com',
    iconLeft: 'fas fa-envelope',
    validator: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    error: 'Please enter a valid email address'
  }
};

/**
 * Disabled field
 */
export const DisabledField = {
  args: {
    label: 'Read Only Field',
    field: 'readonly',
    value: 'This field is disabled',
    disabled: true
  }
};

/**
 * Field with help text
 */
export const WithHelpText = {
  args: {
    label: 'API Key',
    field: 'apiKey',
    options: [
      { label: 'Production', value: 'prod' },
      { label: 'Development', value: 'dev', selected: true }
    ],
    help: {
      text: 'Select the environment for your API key',
      visible: true
    }
  }
};

/**
 * Date picker field
 */
export const DatePicker = {
  args: {
    label: 'Date of Birth',
    field: 'birthday',
    placeholder: 'YYYY-MM-DD',
    date: true,
    maxDate: new Date()
  }
};

/**
 * Field with custom width
 */
export const CustomWidth = {
  args: {
    label: 'Short Field',
    field: 'short',
    width: '150px',
    placeholder: 'Narrow input'
  }
};

/**
 * Hidden field
 */
export const HiddenField = {
  args: {
    label: 'This field is hidden',
    field: 'hidden',
    visible: false,
    placeholder: 'You should not see this'
  }
};

/**
 * Static text (no input)
 */
export const StaticText = {
  args: {
    text: '<strong>Important Notice:</strong> Please read the instructions below before proceeding.',
    id: 'notice'
  }
};

/**
 * Field with onChange handler
 */
export const WithOnChange = {
  args: {
    label: 'Type something',
    field: 'liveUpdate',
    placeholder: 'Type to see updates',
    onInput: (e: Event) => {
      const target = e.target as HTMLInputElement;
      console.log('Input value:', target.value);
    }
  }
};

/**
 * Select-on-focus field
 */
export const SelectOnFocus = {
  args: {
    label: 'Click to select all',
    field: 'selectAll',
    value: 'This text will be selected when you click',
    selectOnFocus: true
  }
};

/**
 * Field with data attributes
 */
export const WithDataAttributes = {
  args: {
    label: 'Categorized Select',
    field: 'category',
    dataPlaceholder: 'Choose a category',
    dataType: 'category',
    options: [
      { label: 'Electronics', value: 'electronics' },
      { label: 'Clothing', value: 'clothing' },
      { label: 'Food', value: 'food' }
    ]
  }
};
