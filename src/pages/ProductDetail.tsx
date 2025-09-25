import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProductDetail } from '../hooks/useProductDetail';
import { useToast } from '../components/ui/use-toast';
import { queryClient } from '../lib/queryClient';
import { Button } from '../components/ui/button';
// ... other imports

const ProductDetail = () => {
  console.log('[ProductDetail] Component mounted at:', new Date().toISOString());
  const { id } = useParams<{ id: string }>();
  console.log('[ProductDetail] Extracted ID from URL:', id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<string[]>([]);

  const { data: product, isLoading, error, isError } = useProductDetail(id || '', !!id);
  console.log('[ProductDetail] useProductDetail response:', { product, isLoading, isError, error });

  // ... rest of the component (render logic, useEffect, etc.)
  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {isError && <div>Error: {error?.message}</div>}
      {!isLoading && !isError && product && (
        <div>
          <h1>{product.name}</h1>
          {/* Rest of your render logic */}
        </div>
      )}
    </div>
  );
};

export default ProductDetail;