import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProductImage {
  id: string
  product_id: string
  image_url: string
  is_primary: boolean
  alt_text: string | null
  display_order: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting product images migration...')

    // Get all product images
    const { data: images, error: fetchError } = await supabase
      .from('product_images')
      .select('id, product_id, image_url, is_primary, alt_text, display_order')
      .eq('is_active', true)

    if (fetchError) {
      console.error('Error fetching images:', fetchError)
      return new Response(JSON.stringify({ error: 'Failed to fetch images' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${images?.length || 0} images to migrate`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const image of images || []) {
      try {
        console.log(`Processing image ${image.id}: ${image.image_url}`)

        // Skip if already in storage
        if (image.image_url.includes('supabase.co/storage')) {
          console.log(`Image ${image.id} already in storage, skipping`)
          continue
        }

        // Download the image
        console.log(`Downloading image from: ${image.image_url}`)
        const response = await fetch(image.image_url)
        
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
        }

        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        // Determine folder based on is_primary
        const folder = image.is_primary ? 'thumbnails' : 'other_images'
        
        // Generate filename with product_id and display_order for uniqueness
        const fileExtension = image.image_url.split('.').pop()?.toLowerCase() || 'jpg'
        const fileName = `${image.product_id}_${image.display_order}.${fileExtension}`
        const filePath = `${folder}/${fileName}`

        console.log(`Uploading to storage: ${filePath}`)

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, uint8Array, {
            contentType: blob.type || 'image/jpeg',
            upsert: true
          })

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath)

        console.log(`Image uploaded successfully. New URL: ${publicUrl}`)

        // Update the database record
        const { error: updateError } = await supabase
          .from('product_images')
          .update({ image_url: publicUrl })
          .eq('id', image.id)

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`)
        }

        successCount++
        console.log(`Successfully migrated image ${image.id}`)

      } catch (error) {
        console.error(`Error processing image ${image.id}:`, error)
        errors.push(`Image ${image.id}: ${error.message}`)
        errorCount++
      }
    }

    console.log(`Migration completed: ${successCount} successful, ${errorCount} errors`)

    return new Response(JSON.stringify({
      success: true,
      message: `Migration completed: ${successCount} images migrated successfully, ${errorCount} errors`,
      details: {
        totalProcessed: images?.length || 0,
        successful: successCount,
        errors: errorCount,
        errorDetails: errors
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Migration function error:', error)
    return new Response(JSON.stringify({
      error: 'Migration failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})