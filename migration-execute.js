// Execute migration function
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppljsayhwtlogficifar.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbGpzYXlod3Rsb2dmaWNpZmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkxMTUsImV4cCI6MjA2OTE4NTExNX0.4p82dukMJBFl1-EU9XOLmiHvBGfEQSFDVDOu9yilhUU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function executeMigration() {
  try {
    console.log('Executing migration...')
    
    const { data, error } = await supabase.functions.invoke('migrate-product-images', {
      body: {}
    })
    
    if (error) {
      console.error('Migration error:', error)
      return false
    }
    
    console.log('Migration result:', data)
    return data?.success || false
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}

executeMigration().then(success => {
  console.log('Migration completed:', success ? 'YES' : 'NO')
})