import { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagInputProps {
  availableTags: Tag[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({
  availableTags,
  selectedTags,
  onTagsChange,
  placeholder = 'Adicionar tag...',
}: TagInputProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(t => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const handleRemove = (tagName: string) => {
    onTagsChange(selectedTags.filter(t => t !== tagName));
  };

  const getTagColor = (tagName: string) => {
    return availableTags.find(t => t.name === tagName)?.color || '#6366f1';
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {selectedTags.map((tagName) => (
        <Badge
          key={tagName}
          variant="secondary"
          className="flex items-center gap-1 px-2 py-1"
          style={{ backgroundColor: `${getTagColor(tagName)}20`, borderColor: getTagColor(tagName), color: getTagColor(tagName) }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getTagColor(tagName) }}
          />
          {tagName}
          <button
            type="button"
            onClick={() => handleRemove(tagName)}
            className="ml-1 hover:opacity-70"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            {placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar tag..." />
            <CommandList>
              <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
              <CommandGroup>
                {availableTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => handleSelect(tag.name)}
                  >
                    <span
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1">{tag.name}</span>
                    {selectedTags.includes(tag.name) && (
                      <Check className="h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
