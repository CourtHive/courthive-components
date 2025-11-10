import { renderForm } from '../components/forms/renderForm';

export default {
  title: 'Renderers/Form',
  tags: ['autodocs'],
  render: ({ items, relationships }) => {
    const container = document.createElement('div');
    container.style.maxWidth = '600px';
    container.style.margin = '20px';
    container.style.padding = '20px';
    container.style.border = '1px solid #e0e0e0';
    container.style.borderRadius = '8px';
    container.style.backgroundColor = '#ffffff';
    
    const inputs = renderForm(container, items, relationships);
    
    // Add submit button to demonstrate form values
    const submitBtn = document.createElement('button');
    submitBtn.className = 'button is-primary';
    submitBtn.innerHTML = 'Log Form Values';
    submitBtn.style.marginTop = '20px';
    submitBtn.onclick = () => {
      const values: any = {};
      Object.keys(inputs).forEach(key => {
        if (key.includes('.date')) return; // Skip datepicker instances
        const input = inputs[key];
        if (input.type === 'checkbox') {
          values[key] = input.checked;
        } else if (input.querySelector) {
          const checked = input.querySelector('input:checked');
          values[key] = checked ? (checked as HTMLInputElement).value : null;
        } else {
          values[key] = input.value;
        }
      });
      console.log('Form values:', values);
      alert('Form values logged to console');
    };
    container.appendChild(submitBtn);
    
    return container;
  }
};

/**
 * Simple login form with validation
 */
export const LoginForm = {
  args: {
    items: [
      {
        text: '<h3>Login</h3>',
        header: true
      },
      {
        label: 'Username',
        field: 'username',
        placeholder: 'Enter username',
        iconLeft: 'fas fa-user',
        validator: (value: string) => value.length >= 3,
        error: 'Username must be at least 3 characters',
        focus: true
      },
      {
        label: 'Password',
        field: 'password',
        type: 'password',
        placeholder: 'Enter password',
        iconRight: 'fas fa-eye',
        validator: (value: string) => value.length >= 6,
        error: 'Password must be at least 6 characters'
      },
      {
        label: 'Remember me',
        field: 'remember',
        id: 'rememberCheck',
        checkbox: true,
        checked: false
      }
    ]
  }
};

/**
 * Simple form with single date picker (like TMX participant editor)
 */
export const ParticipantForm = {
  args: {
    items: [
      {
        text: '<h3>Participant Information</h3>',
        header: true
      },
      {
        label: 'First name',
        field: 'firstName',
        placeholder: 'Given name',
        focus: true,
        validator: (value: string) => value.length >= 2,
        error: 'Please enter a name of at least 2 characters'
      },
      {
        label: 'Last name',
        field: 'lastName',
        placeholder: 'Family name',
        validator: (value: string) => value.length >= 2,
        error: 'Please enter a name of at least 2 characters'
      },
      {
        label: 'Sex',
        field: 'sex',
        options: [
          { label: 'Unknown', value: undefined, selected: true },
          { label: 'Male', value: 'MALE' },
          { label: 'Female', value: 'FEMALE' }
        ]
      },
      {
        label: 'Date of birth',
        field: 'birthday',
        placeholder: 'YYYY-MM-DD',
        date: true,
        maxDate: new Date()
      }
    ]
  }
};

/**
 * User registration form with multiple field types
 */
export const RegistrationForm = {
  args: {
    items: [
      {
        text: '<h3>Create Account</h3>',
        header: true
      },
      { divider: true },
      {
        label: 'Full Name',
        field: 'fullName',
        placeholder: 'John Doe',
        focus: true
      },
      {
        label: 'Email',
        field: 'email',
        type: 'email',
        placeholder: 'john@example.com',
        iconLeft: 'fas fa-envelope',
        validator: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        error: 'Please enter a valid email'
      },
      {
        label: 'Password',
        field: 'password',
        type: 'password',
        placeholder: 'Min 8 characters'
      },
      {
        label: 'Country',
        field: 'country',
        options: [
          { label: 'Select country...', value: '', disabled: true, selected: true },
          { label: 'United States', value: 'USA' },
          { label: 'United Kingdom', value: 'GBR' },
          { label: 'Canada', value: 'CAN' },
          { label: 'Australia', value: 'AUS' }
        ]
      },
      { spacer: 2 },
      {
        label: 'I agree to the terms and conditions',
        field: 'terms',
        id: 'termsCheck',
        checkbox: true,
        checked: false
      }
    ]
  }
};

/**
 * Form with field pairing (two fields in one row)
 */
export const FieldPairing = {
  args: {
    items: [
      {
        text: '<h3>Contact Information</h3>',
        header: true
      },
      {
        label: 'First Name',
        field: 'firstName',
        placeholder: 'John',
        fieldPair: {
          label: 'Last Name',
          field: 'lastName',
          placeholder: 'Doe'
        }
      },
      {
        label: 'Email',
        field: 'email',
        type: 'email',
        placeholder: 'john@example.com',
        fieldPair: {
          label: 'Phone',
          field: 'phone',
          placeholder: '+1 555-0123'
        }
      },
      {
        label: 'City',
        field: 'city',
        placeholder: 'New York',
        fieldPair: {
          label: 'State',
          field: 'state',
          placeholder: 'NY'
        }
      }
    ]
  }
};

/**
 * Form with date range picker (like TMX tournament editor)
 */
export const DateRangeForm = {
  args: {
    items: [
      {
        text: '<h3>Tournament Details</h3>',
        header: true
      },
      {
        label: 'Tournament Name',
        field: 'tournamentName',
        placeholder: 'Tournament name',
        focus: true,
        validator: (value: string) => value.length >= 5,
        error: 'Minimum of 5 characters'
      },
      {
        label: 'Start date',
        field: 'startDate',
        placeholder: 'YYYY-MM-DD',
        value: ''
      },
      {
        label: 'End date',
        field: 'endDate',
        placeholder: 'YYYY-MM-DD',
        value: ''
      },
      {
        label: 'Active Dates',
        field: 'activeDates',
        id: 'activeDates',
        placeholder: 'YYYY-MM-DD',
        maxNumberOfDates: 10,
        date: true
      }
    ],
    relationships: [
      {
        dateRange: true,
        fields: ['startDate', 'endDate']
      }
    ]
  }
};

/**
 * Form with dynamic field relationships
 */
export const DynamicRelationships = {
  args: {
    items: [
      {
        text: '<h3>Password Change</h3>',
        header: true
      },
      {
        label: 'New Password',
        field: 'newPassword',
        type: 'password',
        placeholder: 'Enter new password'
      },
      {
        label: 'Confirm Password',
        field: 'confirmPassword',
        type: 'password',
        placeholder: 'Confirm new password'
      },
      {
        text: 'Passwords must match',
        id: 'matchStatus',
        style: 'color: red; display: none; margin-top: 10px;'
      }
    ],
    relationships: [
      {
        control: 'confirmPassword',
        onInput: ({ inputs }: any) => {
          const newPwd = inputs.newPassword.value;
          const confirmPwd = inputs.confirmPassword.value;
          const status = document.getElementById('matchStatus');
          
          if (status) {
            if (confirmPwd && newPwd !== confirmPwd) {
              status.style.display = 'block';
              status.style.color = 'red';
              status.innerHTML = '❌ Passwords do not match';
            } else if (confirmPwd && newPwd === confirmPwd) {
              status.style.display = 'block';
              status.style.color = 'green';
              status.innerHTML = '✓ Passwords match';
            } else {
              status.style.display = 'none';
            }
          }
        }
      }
    ]
  }
};

/**
 * Form with radio button groups
 */
export const RadioButtonForm = {
  args: {
    items: [
      {
        text: '<h3>Survey Form</h3>',
        header: true
      },
      {
        label: 'How satisfied are you with our service?',
        radio: true,
        id: 'satisfaction',
        options: [
          { text: 'Very Satisfied', checked: false },
          { text: 'Satisfied', checked: true },
          { text: 'Neutral', checked: false },
          { text: 'Dissatisfied', checked: false }
        ]
      },
      { spacer: 2 },
      {
        label: 'Would you recommend us?',
        radio: true,
        id: 'recommend',
        options: [
          { text: 'Yes', checked: false },
          { text: 'No', checked: false },
          { text: 'Maybe', checked: false }
        ]
      }
    ]
  }
};

/**
 * Form with dividers and spacers
 */
export const VisualSections = {
  args: {
    items: [
      {
        text: '<h3>Account Settings</h3>',
        header: true
      },
      { divider: true },
      {
        text: '<strong>Personal Information</strong>'
      },
      {
        label: 'Display Name',
        field: 'displayName',
        placeholder: 'Your name'
      },
      {
        label: 'Bio',
        field: 'bio',
        placeholder: 'Tell us about yourself'
      },
      { spacer: 2 },
      { divider: true },
      {
        text: '<strong>Privacy Settings</strong>'
      },
      {
        label: 'Make profile public',
        field: 'public',
        id: 'publicCheck',
        checkbox: true,
        checked: true
      },
      {
        label: 'Allow messages from non-contacts',
        field: 'allowMessages',
        id: 'messagesCheck',
        checkbox: true,
        checked: false
      }
    ]
  }
};

/**
 * Form with custom widths
 */
export const CustomWidths = {
  args: {
    items: [
      {
        text: '<h3>Product Details</h3>',
        header: true
      },
      {
        label: 'Product Name',
        field: 'productName',
        placeholder: 'Enter product name'
      },
      {
        label: 'SKU',
        field: 'sku',
        placeholder: 'ABC-123',
        width: '200px'
      },
      {
        label: 'Price',
        field: 'price',
        type: 'number',
        placeholder: '0.00',
        width: '150px'
      },
      {
        label: 'Description',
        field: 'description',
        placeholder: 'Product description'
      }
    ]
  }
};

/**
 * Complex form with all features
 */
export const CompleteExample = {
  args: {
    items: [
      {
        text: '<h2>Tournament Registration</h2>',
        header: true,
        style: 'color: #4a90e2; margin-bottom: 10px;'
      },
      { divider: true },
      {
        text: '<strong>Participant Information</strong>'
      },
      {
        label: 'Full Name',
        field: 'fullName',
        placeholder: 'John Doe',
        iconLeft: 'fas fa-user',
        validator: (value: string) => value.length >= 3,
        error: 'Name must be at least 3 characters',
        focus: true
      },
      {
        label: 'Email',
        field: 'email',
        type: 'email',
        placeholder: 'john@example.com',
        iconLeft: 'fas fa-envelope',
        fieldPair: {
          label: 'Phone',
          field: 'phone',
          placeholder: '+1 555-0123'
        }
      },
      { spacer: 2 },
      { divider: true },
      {
        text: '<strong>Tournament Details</strong>'
      },
      {
        label: 'Event',
        field: 'event',
        options: [
          { label: 'Select event...', value: '', disabled: true, selected: true },
          { label: "Men's Singles", value: 'MS' },
          { label: "Women's Singles", value: 'WS' },
          { label: "Men's Doubles", value: 'MD' },
          { label: "Women's Doubles", value: 'WD' }
        ]
      },
      {
        label: 'Skill Level',
        radio: true,
        id: 'skillLevel',
        options: [
          { text: 'Beginner', checked: false },
          { text: 'Intermediate', checked: true },
          { text: 'Advanced', checked: false }
        ]
      },
      { spacer: 1 },
      {
        label: 'I agree to the tournament rules',
        field: 'agreeRules',
        id: 'rulesCheck',
        checkbox: true,
        checked: false
      }
    ]
  }
};
