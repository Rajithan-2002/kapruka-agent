const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function main() {
    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        const getEnv = (key) => {
            const match = envContent.match(new RegExp(`${key}=(.+)`));
            return match ? match[1].trim().replace(/['"\r]/g, '') : null;
        };

        const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL');
        const supabaseKey = getEnv('SUPABASE_SERVICE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase credentials in .env');
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const guestId = "22222222-2222-2222-2222-222222222222";
        console.log(`Checking/Creating guest user with ID: ${guestId}...`);

        try {
            const { data, error: getError } = await supabase.auth.admin.getUserById(guestId);
            if (data && data.user) {
                console.log("Guest user already exists:", data.user.id);
                return;
            }
        } catch (_) {}

        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            id: guestId,
            email: 'guest@kapruka.com',
            password: 'guestPassword123!',
            email_confirm: true,
            user_metadata: { name: 'Guest User' }
        });

        if (createError) {
            console.error("Error creating guest user:", createError.message);
        } else {
            console.log("Successfully created guest user:", newUser.user.id);
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

main();
