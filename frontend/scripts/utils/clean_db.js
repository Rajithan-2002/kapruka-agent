const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function clean() {
    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        const getEnv = (key) => {
            const match = envContent.match(new RegExp(`${key}=(.+)`));
            return match ? match[1].trim() : null;
        };

        const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
        const supabaseKey = getEnv('SUPABASE_SERVICE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase credentials in .env');
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('relationships')
            .select('*');
            
        if (error) throw error;
        
        console.log(`Found ${data.length} total relationships.`);
        let count = 0;
        
        for (const rel of data) {
            if (rel.nickname === 'Nethmi' || rel.nickname === 'Dad') {
                const { error: delError } = await supabase
                    .from('relationships')
                    .delete()
                    .eq('id', rel.id);
                if (delError) console.error(delError);
                else count++;
            }
        }
        console.log(`Successfully deleted ${count} mock relationships.`);
    } catch (e) {
        console.error('Error:', e);
    }
}
clean();
