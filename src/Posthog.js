import posthog from 'posthog-js'

const loadPosthog = () => {
    posthog.init('phc_gaex6n8piCE8xkDEq6IPAmvkNBFinGBZkilZXfsuTnG',
        {
            api_host: 'https://us.i.posthog.com',
            person_profiles: 'always' // or 'always' to create profiles for anonymous users as well
        }
    )
}

export default loadPosthog;