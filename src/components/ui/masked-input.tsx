import { forwardRef, ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { maskCPF, maskCNPJ, maskPhone, maskCurrency } from '@/lib/masks';

type MaskType = 'cpf' | 'cnpj' | 'phone' | 'currency' | 'document';

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: MaskType;
  documentType?: 'cpf' | 'cnpj';
  onValueChange?: (value: string, maskedValue: string) => void;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, documentType, onValueChange, onChange, value, ...props }, ref) => {
    const applyMask = (inputValue: string): string => {
      switch (mask) {
        case 'cpf':
          return maskCPF(inputValue);
        case 'cnpj':
          return maskCNPJ(inputValue);
        case 'phone':
          return maskPhone(inputValue);
        case 'currency':
          return maskCurrency(inputValue);
        case 'document':
          return documentType === 'cpf' ? maskCPF(inputValue) : maskCNPJ(inputValue);
        default:
          return inputValue;
      }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const maskedValue = applyMask(rawValue);
      
      // Update the input value
      e.target.value = maskedValue;
      
      // Call the original onChange if provided
      if (onChange) {
        onChange(e);
      }
      
      // Call onValueChange with both raw and masked values
      if (onValueChange) {
        const unmaskedValue = rawValue.replace(/\D/g, '');
        onValueChange(unmaskedValue, maskedValue);
      }
    };

    const getMaxLength = (): number | undefined => {
      switch (mask) {
        case 'cpf':
          return 14; // 000.000.000-00
        case 'cnpj':
          return 18; // 00.000.000/0000-00
        case 'phone':
          return 15; // (00) 00000-0000
        case 'document':
          return documentType === 'cpf' ? 14 : 18;
        default:
          return undefined;
      }
    };

    const getPlaceholder = (): string => {
      if (props.placeholder) return props.placeholder;
      switch (mask) {
        case 'cpf':
          return '000.000.000-00';
        case 'cnpj':
          return '00.000.000/0000-00';
        case 'phone':
          return '(00) 00000-0000';
        case 'document':
          return documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00';
        default:
          return '';
      }
    };

    const displayValue = value ? applyMask(String(value)) : '';

    return (
      <Input
        ref={ref}
        {...props}
        value={displayValue}
        onChange={handleChange}
        maxLength={getMaxLength()}
        placeholder={getPlaceholder()}
        inputMode={mask === 'currency' ? 'numeric' : 'text'}
      />
    );
  }
);

MaskedInput.displayName = 'MaskedInput';
