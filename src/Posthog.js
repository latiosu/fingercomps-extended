import posthog from 'posthog-js'

const loadPosthog = () => {
    // Skip posthog for local
    if (process.env.NODE_ENV !== 'development') {
        posthog.init('phc_gaex6n8piCE8xkDEq6IPAmvkNBFinGBZkilZXfsuTnG',
            {
                api_host: 'https://us.i.posthog.com',
                person_profiles: 'always' // or 'always' to create profiles for anonymous users as well
            }
        )
    }
}

export default loadPosthog;