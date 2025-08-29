import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

interface CategoryDropdownProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  maxVisibleCategories?: number;
}

const CategoryDropdown = ({ 
  categories, 
  selectedCategory, 
  onCategoryChange, 
  maxVisibleCategories = 4 
}: CategoryDropdownProps) => {
  const visibleCategories = categories.slice(0, maxVisibleCategories + 1); // +1 for "all"
  const dropdownCategories = categories.slice(maxVisibleCategories + 1);

  return (
    <div className="flex justify-center mb-12">
      <div className="flex flex-wrap items-center gap-2 bg-background rounded-lg p-2 shadow-lg">
        {visibleCategories.map((category) => (
          <Button
            key={category}
            onClick={() => onCategoryChange(category)}
            variant={selectedCategory === category ? "default" : "ghost"}
            size="sm"
            className={`capitalize transition-all duration-300 ${
              selectedCategory === category
                ? "bg-brand-beige text-brand-beige-foreground shadow-md hover:bg-brand-beige/90"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {category}
          </Button>
        ))}
        
        {dropdownCategories.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                More
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 bg-background border shadow-lg rounded-lg p-1"
            >
              {dropdownCategories.map((category) => (
                <DropdownMenuItem
                  key={category}
                  onClick={() => onCategoryChange(category)}
                  className={`capitalize cursor-pointer transition-colors px-3 py-2 rounded-md ${
                    selectedCategory === category
                      ? "bg-brand-beige text-brand-beige-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {category}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export default CategoryDropdown;