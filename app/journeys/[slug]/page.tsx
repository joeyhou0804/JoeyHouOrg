import JourneyDetailClient from './JourneyDetailClient'
import { getJourneyBySlug, getAllJourneys, getAllDestinations, getAllHomeLocations } from '@/lib/db'
import { transformJourney, transformDestination, transformHomeLocation } from '@/lib/transform'
import { calculateRouteDisplay, calculateRouteDisplayCN } from 'src/utils/journeyHelpers'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  const journeys = await getAllJourneys()
  return journeys.map((journey) => ({
    slug: journey.slug,
  }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const journeyFromDb = await getJourneyBySlug(params.slug)

  if (!journeyFromDb) {
    return {
      title: 'Journey Not Found | Joey Hou\'s Journal',
      description: 'The requested journey could not be found.',
    }
  }

  const journey = transformJourney(journeyFromDb)
  const homeLocationsFromDb = await getAllHomeLocations()
  const homeLocations = homeLocationsFromDb.map(transformHomeLocation)
  const route = calculateRouteDisplay(journey, homeLocations)

  return {
    title: `${journey.name} | Joey Hou's Journal`,
    description: journey.description || `Explore the ${journey.name} journey - ${route}. ${journey.days} ${journey.days === 1 ? 'day' : 'days'}, ${journey.totalPlaces} ${journey.totalPlaces === 1 ? 'destination' : 'destinations'}.`,
    openGraph: {
      title: journey.name,
      description: journey.description || `${route} - ${journey.days} ${journey.days === 1 ? 'day' : 'days'} journey`,
      type: 'article',
      url: `https://www.joeyhoujournal.com/journeys/${journey.slug}`,
    },
  }
}

export default async function JourneyDetailPage({ params }: { params: { slug: string } }) {
  const journeyFromDb = await getJourneyBySlug(params.slug)

  if (!journeyFromDb) {
    return <JourneyDetailClient journey={undefined} />
  }

  // Transform to app format
  const journey = transformJourney(journeyFromDb)

  // Fetch home locations
  const homeLocationsFromDb = await getAllHomeLocations()
  const homeLocations = homeLocationsFromDb.map(transformHomeLocation)

  // Calculate route display using helper functions
  const route = calculateRouteDisplay(journey, homeLocations)
  const routeCN = calculateRouteDisplayCN(journey, homeLocations)

  // Create trip object for client component
  const trip = {
    name: journey.name,
    nameCN: journey.nameCN,
    slug: journey.slug,
    places: journey.totalPlaces,
    description: journey.description,
    route: route,
    routeCN: routeCN,
    duration: journey.duration,
    days: journey.days,
    nights: journey.nights,
    visitedPlaceIds: journey.visitedPlaceIds,
    journeyId: journey.id,
    segments: journey.segments,
    startDate: journey.startDate,
    endDate: journey.endDate
  }

  return <JourneyDetailClient journey={trip} />
}
