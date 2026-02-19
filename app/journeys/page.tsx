'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useMemo } from 'react'
import { MapPin, Calendar, Train, Clock, Search } from 'lucide-react'
import Fuse from 'fuse.js'
import NavigationMenu from 'src/components/NavigationMenu'
import Footer from 'src/components/Footer'
import Box from '@mui/material/Box'
import JourneyCard from 'src/components/JourneyCard'
import dynamic from 'next/dynamic'
import MapViewHint from 'src/components/MapViewHint'
import ViewHintsDrawer from 'src/components/ViewHintsDrawer'
import TransportationFilterDrawer from 'src/components/TransportationFilterDrawer'
import DayTripFilterDrawer from 'src/components/DayTripFilterDrawer'
import GroupSizeFilterDrawer from 'src/components/GroupSizeFilterDrawer'
import DayTripGroupSizeFilterDrawer from 'src/components/DayTripGroupSizeFilterDrawer'
import TripLengthFilterDrawer from 'src/components/TripLengthFilterDrawer'
import ListGroupSizeFilterDrawer from 'src/components/ListGroupSizeFilterDrawer'
import CombinedOtherFilterDrawer from 'src/components/CombinedOtherFilterDrawer'
import MixedText from 'src/components/MixedText'
import { getRouteCoordinatesFromSegments } from 'src/utils/routeHelpers'
import { useTranslation } from 'src/hooks/useTranslation'
import { useFontFamily } from 'src/hooks/useFontFamily'
import { formatDuration } from 'src/utils/formatDuration'
import { calculateRouteDisplay, calculateRouteDisplayCN } from 'src/utils/journeyHelpers'
import { vw, rvw, rShadow } from 'src/utils/scaling'

const InteractiveMap = dynamic(() => import('src/components/InteractiveMap'), {
  ssr: false,
  loading: () => {
    const { tr } = useTranslation()
    return (
      <Box sx={{ width: '100%', height: rvw(600, 600), borderRadius: rvw(8, 8), backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-gray-600">{tr.loadingMap}</p>
      </Box>
    )
  }
})

export default function JourneysPage() {
  const { locale, tr } = useTranslation()
  const { titleFont } = useFontFamily()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMenuButtonVisible, setIsMenuButtonVisible] = useState(true)
  const [isDrawerAnimating, setIsDrawerAnimating] = useState(false)
  const [isMenuButtonAnimating, setIsMenuButtonAnimating] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [currentJourneyIndex, setCurrentJourneyIndex] = useState(0)
  const [currentDayTripIndex, setCurrentDayTripIndex] = useState(0)
  const [xsDisplayCount, setXsDisplayCount] = useState(5)
  const [journeysData, setJourneysData] = useState<any[]>([])
  const [allDestinations, setAllDestinations] = useState<any[]>([])
  const [homeLocations, setHomeLocations] = useState<any[]>([])

  // Preload title images and backgrounds
  useEffect(() => {
    const preloadImages = [
      `https://res.cloudinary.com/joey-hou-homepage/image/upload/w_1920,f_auto,q_auto/joeyhoujournal/headers/journeys_page_title_${locale}.jpg`,
      `https://res.cloudinary.com/joey-hou-homepage/image/upload/w_800,f_auto,q_auto/joeyhoujournal/headers/journey_page_title_xs_${locale}.jpg`,
      '/images/backgrounds/homepage_background_2.webp',
      '/images/backgrounds/homepage_background.webp',
      '/images/destinations/destination_page_map_background.webp',
      // Transportation filter icons
      '/images/icons/filter/all_transport_icon.png',
      '/images/icons/filter/train_only_icon.png',
      '/images/icons/filter/other_transport_icon.png',
      // Group size filter icons
      '/images/icons/filter/all_group_sizes.png',
      '/images/icons/filter/visit_by_myself.png',
      '/images/icons/filter/visit_with_others.png',
      // Day trip location filter icons
      '/images/icons/filter/all_destination_icon.png',
      '/images/icons/filter/around_home_destination.png',
      '/images/icons/filter/around_new_york_icon.png',
      // Trip length filter icons
      '/images/icons/filter/all_trip_icon.png',
      '/images/icons/filter/long_trip_icon.png',
      '/images/icons/filter/day_trip_icon.png',
      // Other filter icons
      '/images/icons/filter/stay_overnight.png',
      '/images/icons/filter/visit_on_train.png',
      '/images/icons/filter/photo_stops_on_trains.png',
      '/images/icons/filter/visit_more_than_once.png'
    ]
    preloadImages.forEach(src => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = src
      document.head.appendChild(link)
    })
  }, [locale])
  const [isLoading, setIsLoading] = useState(true)
  const [isViewHintsDrawerOpen, setIsViewHintsDrawerOpen] = useState(false)
  const [isHintButtonHovered, setIsHintButtonHovered] = useState(false)
  const [isTransportationFilterHovered, setIsTransportationFilterHovered] = useState(false)
  const [isLongTripGroupSizeFilterHovered, setIsLongTripGroupSizeFilterHovered] = useState(false)
  const [isDayTripGroupSizeFilterHovered, setIsDayTripGroupSizeFilterHovered] = useState(false)
  const [isDayTripLocationFilterHovered, setIsDayTripLocationFilterHovered] = useState(false)
  const [isTripLengthFilterHovered, setIsTripLengthFilterHovered] = useState(false)
  const [isListGroupSizeFilterHovered, setIsListGroupSizeFilterHovered] = useState(false)
  const [isCombinedOtherFilterHovered, setIsCombinedOtherFilterHovered] = useState(false)
  const [isTransportationFilterDrawerOpen, setIsTransportationFilterDrawerOpen] = useState(false)
  const [isDayTripFilterDrawerOpen, setIsDayTripFilterDrawerOpen] = useState(false)
  const [isGroupSizeFilterDrawerOpen, setIsGroupSizeFilterDrawerOpen] = useState(false)
  const [isDayTripGroupSizeFilterDrawerOpen, setIsDayTripGroupSizeFilterDrawerOpen] = useState(false)
  const [isTripLengthFilterDrawerOpen, setIsTripLengthFilterDrawerOpen] = useState(false)
  const [selectedTransportationFilter, setSelectedTransportationFilter] = useState<string>('all_transportation')
  const [selectedDayTripFilter, setSelectedDayTripFilter] = useState<string>('all_day_trips')
  const [selectedGroupSizeFilter, setSelectedGroupSizeFilter] = useState<string>('all_group_sizes')
  const [selectedDayTripGroupSizeFilter, setSelectedDayTripGroupSizeFilter] = useState<string>('all_day_trip_group_sizes')
  const [selectedTripLengthFilter, setSelectedTripLengthFilter] = useState<string>('all_trips')
  const [isListGroupSizeFilterDrawerOpen, setIsListGroupSizeFilterDrawerOpen] = useState(false)
  const [selectedListGroupSizeFilter, setSelectedListGroupSizeFilter] = useState<string>('all_group_sizes')
  const [isCombinedOtherFilterDrawerOpen, setIsCombinedOtherFilterDrawerOpen] = useState(false)
  const [selectedCombinedOtherFilter, setSelectedCombinedOtherFilter] = useState<string>('all_transportation')
  const [searchQuery, setSearchQuery] = useState('')
  const listSectionRef = useRef<HTMLDivElement>(null)

  // Recent journeys carousel state
  const [currentRecentJourneySlide, setCurrentRecentJourneySlide] = useState(0)
  const [isRecentJourneyTransitioning, setIsRecentJourneyTransitioning] = useState(false)

  const itemsPerPage = 5

  // Icon maps for filters
  const transportationFilterIconMap: { [key: string]: string } = {
    'all_transportation': '/images/icons/filter/all_transport_icon.png',
    'train_only': '/images/icons/filter/train_only_icon.png',
    'other_transportation': '/images/icons/filter/other_transport_icon.png'
  }

  const longTripGroupSizeFilterIconMap: { [key: string]: string } = {
    'all_group_sizes': '/images/icons/filter/all_group_sizes.png',
    'visit_by_myself': '/images/icons/filter/visit_by_myself.png',
    'visit_with_others': '/images/icons/filter/visit_with_others.png'
  }

  const dayTripGroupSizeFilterIconMap: { [key: string]: string } = {
    'all_day_trip_group_sizes': '/images/icons/filter/all_group_sizes.png',
    'day_trip_by_myself': '/images/icons/filter/visit_by_myself.png',
    'day_trip_with_others': '/images/icons/filter/visit_with_others.png'
  }

  const dayTripLocationFilterIconMap: { [key: string]: string } = {
    'all_day_trips': '/images/icons/filter/all_destination_icon.png',
    'around_home': '/images/icons/filter/around_home_destination.png',
    'around_new_york': '/images/icons/filter/around_new_york_icon.png'
  }

  const tripLengthFilterIconMap: { [key: string]: string } = {
    'all_trips': '/images/icons/filter/all_trip_icon.png',
    'long_trips': '/images/icons/filter/long_trip_icon.png',
    'day_trips': '/images/icons/filter/day_trip_icon.png'
  }

  const listGroupSizeFilterIconMap: { [key: string]: string } = {
    'all_group_sizes': '/images/icons/filter/all_group_sizes.png',
    'visit_by_myself': '/images/icons/filter/visit_by_myself.png',
    'visit_with_others': '/images/icons/filter/visit_with_others.png'
  }

  // Combined other filter icon map (changes based on trip length)
  const getCombinedOtherFilterIcon = () => {
    if (selectedTripLengthFilter === 'long_trips') {
      // Use transportation icons for long trips
      return transportationFilterIconMap[selectedCombinedOtherFilter] || transportationFilterIconMap['all_transportation']
    } else if (selectedTripLengthFilter === 'day_trips') {
      // Use day trip location icons for day trips
      return dayTripLocationFilterIconMap[selectedCombinedOtherFilter] || dayTripLocationFilterIconMap['all_day_trips']
    } else {
      // Default to all destination icon
      return '/images/icons/filter/all_destination_icon.png'
    }
  }

  // Fetch data from API
  useEffect(() => {
    async function fetchData() {
      try {
        const [journeysRes, destinationsRes, homeLocationsRes] = await Promise.all([
          fetch('/api/journeys'),
          fetch('/api/destinations'),
          fetch('/api/home-locations')
        ])
        const journeys = await journeysRes.json()
        const destinations = await destinationsRes.json()
        const homeLocationsData = await homeLocationsRes.json()
        setJourneysData(journeys)
        setAllDestinations(destinations)
        setHomeLocations(homeLocationsData)

        // Preload first image from each destination for map popups
        destinations.forEach((dest: any) => {
          if (dest.images && dest.images.length > 0) {
            const link = document.createElement('link')
            link.rel = 'preload'
            link.as = 'image'
            link.href = dest.images[0]
            document.head.appendChild(link)
          }
        })
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Reset journey index when transportation filter changes
  useEffect(() => {
    setCurrentJourneyIndex(0)
  }, [selectedTransportationFilter])

  // Reset journey index when group size filter changes
  useEffect(() => {
    setCurrentJourneyIndex(0)
  }, [selectedGroupSizeFilter])

  // Reset day trip index when day trip filter changes
  useEffect(() => {
    setCurrentDayTripIndex(0)
  }, [selectedDayTripFilter])

  // Reset day trip index when day trip group size filter changes
  useEffect(() => {
    setCurrentDayTripIndex(0)
  }, [selectedDayTripGroupSizeFilter])

  // Transform journeys to trips format and add route string with images
  const trips = journeysData.map((journey: any) => {
    // Find destinations for this journey
    const journeyDestinations = allDestinations.filter(
      destination => destination.journeyName === journey.name
    )

    // Get the first image from any destination in this journey
    let imageUrl = null
    for (const destination of journeyDestinations) {
      if (destination.images && destination.images.length > 0) {
        imageUrl = destination.images[0]
        break
      }
    }

    // Calculate route display using helper functions
    const routeEnglish = calculateRouteDisplay(journey, homeLocations)
    const routeChinese = calculateRouteDisplayCN(journey, homeLocations)
    const routeDisplay = locale === 'zh' ? routeChinese : routeEnglish

    return {
      name: journey.name,
      nameCN: journey.nameCN,
      slug: journey.slug,
      places: journey.totalPlaces,
      description: journey.description,
      route: routeDisplay,
      duration: journey.duration,
      days: journey.days,
      nights: journey.nights,
      image: imageUrl
    }
  })

  // Filter journeys into regular and day trips
  const allRegularJourneys = journeysData.filter((journey: any) => !journey.isDayTrip)
  const allDayTripJourneys = journeysData.filter((journey: any) => journey.isDayTrip)

  // Apply transportation filter to regular journeys
  const filterByTransportation = (journeys: any[]) => {
    if (selectedTransportationFilter === 'all_transportation') {
      return journeys
    }

    if (selectedTransportationFilter === 'train_only') {
      // Show only train trips (isTrainTrip === true)
      return journeys.filter((journey: any) => journey.isTrainTrip === true)
    }

    if (selectedTransportationFilter === 'other_transportation') {
      // Show other transportation (isTrainTrip === false)
      return journeys.filter((journey: any) => journey.isTrainTrip === false)
    }

    return journeys
  }

  // Apply group size filter to regular journeys (long trips)
  const filterByGroupSize = (journeys: any[]) => {
    if (selectedGroupSizeFilter === 'all_group_sizes') {
      return journeys
    }

    if (selectedGroupSizeFilter === 'visit_by_myself') {
      // Show trips by myself (travelWithOthers === false)
      return journeys.filter((journey: any) => journey.travelWithOthers === false)
    }

    if (selectedGroupSizeFilter === 'visit_with_others') {
      // Show trips with others (travelWithOthers === true)
      return journeys.filter((journey: any) => journey.travelWithOthers === true)
    }

    return journeys
  }

  // Apply group size filter to day trips
  const filterDayTripsByGroupSize = (journeys: any[]) => {
    if (selectedDayTripGroupSizeFilter === 'all_day_trip_group_sizes') {
      return journeys
    }

    if (selectedDayTripGroupSizeFilter === 'day_trip_by_myself') {
      // Show day trips by myself (tripWithOthers === false)
      return journeys.filter((journey: any) => journey.tripWithOthers === false)
    }

    if (selectedDayTripGroupSizeFilter === 'day_trip_with_others') {
      // Show day trips with others (tripWithOthers === true)
      return journeys.filter((journey: any) => journey.tripWithOthers === true)
    }

    return journeys
  }

  // Apply day trip filter (other filters: location-based)
  const filterDayTrips = (journeys: any[]) => {
    if (selectedDayTripFilter === 'all_day_trips') {
      return journeys
    }

    if (selectedDayTripFilter === 'around_home') {
      // Show trips around home (isAroundHome === true)
      return journeys.filter((journey: any) => journey.isAroundHome === true)
    }

    if (selectedDayTripFilter === 'around_new_york') {
      // Show trips around New York (isAroundNewYork === true)
      return journeys.filter((journey: any) => journey.isAroundNewYork === true)
    }

    return journeys
  }

  // Apply filters
  const regularJourneys = filterByGroupSize(filterByTransportation(allRegularJourneys))
  const dayTripJourneys = filterDayTrips(filterDayTripsByGroupSize(allDayTripJourneys))

  // Get current regular journey based on index (with safety check)
  const safeJourneyIndex = regularJourneys.length > 0 ? Math.min(currentJourneyIndex, regularJourneys.length - 1) : 0
  const currentJourney = regularJourneys[safeJourneyIndex]
  const currentJourneyPlaces = useMemo(() => {
    return currentJourney ? allDestinations.filter(
      destination => destination.journeyName === currentJourney.name
    ).map((destination) => ({
      id: destination.id,
      name: destination.name,
      nameCN: destination.nameCN,
      date: destination.date,
      journeyName: destination.journeyName,
      journeyNameCN: destination.journeyNameCN,
      state: destination.state,
      images: destination.images || [],
      lat: destination.lat,
      lng: destination.lng
    })) : []
  }, [currentJourney, allDestinations])

  // Get the route for the current regular journey
  const currentJourneyRoute = currentJourney ? trips.find(t => t.slug === currentJourney.slug)?.route || '' : ''
  const currentJourneyRouteCoordinates = useMemo(() => {
    return currentJourney ? getRouteCoordinatesFromSegments(currentJourney.segments) : []
  }, [currentJourney])

  // Get current day trip based on index (with safety check)
  const safeDayTripIndex = dayTripJourneys.length > 0 ? Math.min(currentDayTripIndex, dayTripJourneys.length - 1) : 0
  const currentDayTrip = dayTripJourneys[safeDayTripIndex]
  const currentDayTripPlaces = useMemo(() => {
    return currentDayTrip ? allDestinations.filter(
      destination => destination.journeyName === currentDayTrip.name
    ).map((destination) => ({
      id: destination.id,
      name: destination.name,
      nameCN: destination.nameCN,
      date: destination.date,
      journeyName: destination.journeyName,
      journeyNameCN: destination.journeyNameCN,
      state: destination.state,
      images: destination.images || [],
      lat: destination.lat,
      lng: destination.lng
    })) : []
  }, [currentDayTrip, allDestinations])

  // Get the route for the current day trip
  const currentDayTripRoute = currentDayTrip ? trips.find(t => t.slug === currentDayTrip.slug)?.route || '' : ''
  const currentDayTripRouteCoordinates = useMemo(() => {
    return currentDayTrip ? getRouteCoordinatesFromSegments(currentDayTrip.segments) : []
  }, [currentDayTrip])

  const handlePrevJourney = () => {
    setCurrentJourneyIndex((prev) => (prev - 1 + regularJourneys.length) % regularJourneys.length)
  }

  const handleNextJourney = () => {
    setCurrentJourneyIndex((prev) => (prev + 1) % regularJourneys.length)
  }

  const handlePrevDayTrip = () => {
    setCurrentDayTripIndex((prev) => (prev - 1 + dayTripJourneys.length) % dayTripJourneys.length)
  }

  const handleNextDayTrip = () => {
    setCurrentDayTripIndex((prev) => (prev + 1) % dayTripJourneys.length)
  }

  // Filter trips by trip length and group size combined
  const filterTrips = (trips: any[]) => {
    let filtered = trips

    // First filter by trip length
    if (selectedTripLengthFilter === 'long_trips') {
      filtered = filtered.filter((trip) => {
        const journey = journeysData.find(j => j.slug === trip.slug)
        return journey && journey.isDayTrip === false
      })
    } else if (selectedTripLengthFilter === 'day_trips') {
      filtered = filtered.filter((trip) => {
        const journey = journeysData.find(j => j.slug === trip.slug)
        return journey && journey.isDayTrip === true
      })
    }

    // Then filter by group size based on trip length context
    if (selectedListGroupSizeFilter !== 'all_group_sizes') {
      filtered = filtered.filter((trip) => {
        const journey = journeysData.find(j => j.slug === trip.slug)
        if (!journey) return false

        const isAlone = selectedListGroupSizeFilter === 'visit_by_myself'

        // For day trips, use tripWithOthers field
        if (journey.isDayTrip) {
          return isAlone ? journey.tripWithOthers === false : journey.tripWithOthers === true
        } else {
          // For long trips, use travelWithOthers field
          return isAlone ? journey.travelWithOthers === false : journey.travelWithOthers === true
        }
      })
    }

    // Finally filter by combined other filter
    if (selectedTripLengthFilter === 'long_trips') {
      // Apply transportation filter for long trips
      if (selectedCombinedOtherFilter === 'train_only') {
        filtered = filtered.filter((trip) => {
          const journey = journeysData.find(j => j.slug === trip.slug)
          return journey && journey.isTrainTrip === true
        })
      } else if (selectedCombinedOtherFilter === 'other_transportation') {
        filtered = filtered.filter((trip) => {
          const journey = journeysData.find(j => j.slug === trip.slug)
          return journey && journey.isTrainTrip === false
        })
      }
    } else if (selectedTripLengthFilter === 'day_trips') {
      // Apply day trip location filter
      if (selectedCombinedOtherFilter === 'around_home') {
        filtered = filtered.filter((trip) => {
          const journey = journeysData.find(j => j.slug === trip.slug)
          return journey && journey.isAroundHome === true
        })
      } else if (selectedCombinedOtherFilter === 'around_new_york') {
        filtered = filtered.filter((trip) => {
          const journey = journeysData.find(j => j.slug === trip.slug)
          return journey && journey.isAroundNewYork === true
        })
      }
    }

    return filtered
  }

  const filteredTrips = filterTrips(trips)

  // Apply intelligent search filter with fuzzy matching
  const searchFilteredTrips = useMemo(() => {
    if (!searchQuery.trim()) return filteredTrips

    // Prepare trips with associated destination data for comprehensive search
    const tripsWithDestinations = filteredTrips.map(trip => {
      const journey = journeysData.find(j => j.slug === trip.slug)
      let destinationSearchText = ''

      if (journey) {
        const journeyDestinations = allDestinations.filter(
          destination => destination.journeyName === journey.name
        )
        // Combine all destination names and states into searchable text
        destinationSearchText = journeyDestinations
          .map(dest => [dest.name, dest.nameCN, dest.state].filter(Boolean).join(' '))
          .join(' ')
      }

      return {
        ...trip,
        destinationSearchText
      }
    })

    // Configure Fuse.js for intelligent fuzzy search
    const fuse = new Fuse(tripsWithDestinations, {
      keys: [
        { name: 'name', weight: 4 },                    // Highest priority: Journey name (EN)
        { name: 'nameCN', weight: 4 },                  // Highest priority: Journey name (CN)
        { name: 'route', weight: 2.5 },                 // High priority: Route description
        { name: 'destinationSearchText', weight: 2 },   // Medium priority: Associated destinations
        { name: 'description', weight: 1 }              // Lower priority: Journey description
      ],
      threshold: 0.4,              // Allow moderate fuzziness (0=exact, 1=match anything)
      distance: 100,               // Max distance for match location
      minMatchCharLength: 2,       // Require at least 2 characters to match
      ignoreLocation: true,        // Search anywhere in the string
      includeScore: true,          // Include relevance scores for ranking
      useExtendedSearch: false,
      findAllMatches: true
    })

    // Perform fuzzy search and return results sorted by relevance
    const results = fuse.search(searchQuery)
    return results.map(result => result.item)
  }, [filteredTrips, searchQuery, journeysData, allDestinations])

  const sortedTrips = [...searchFilteredTrips].sort((a, b) => {
    // Sort by index/order - always show latest first
    const indexA = trips.indexOf(a)
    const indexB = trips.indexOf(b)
    return indexA - indexB
  })

  const totalPages = Math.ceil(sortedTrips.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const displayedTrips = sortedTrips.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    if (listSectionRef.current) {
      listSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleTransportationFilterChange = (filterId: string) => {
    setSelectedTransportationFilter(filterId)
  }

  const handleDayTripFilterChange = (filterId: string) => {
    setSelectedDayTripFilter(filterId)
  }

  const handleGroupSizeFilterChange = (filterId: string) => {
    setSelectedGroupSizeFilter(filterId)
  }

  const handleDayTripGroupSizeFilterChange = (filterId: string) => {
    setSelectedDayTripGroupSizeFilter(filterId)
  }

  const handleTripLengthFilterChange = (filterId: string) => {
    setSelectedTripLengthFilter(filterId)
    setSelectedListGroupSizeFilter('all_group_sizes') // Reset group size filter when trip length changes
    // Reset combined other filter based on new trip length
    if (filterId === 'long_trips') {
      setSelectedCombinedOtherFilter('all_transportation')
    } else if (filterId === 'day_trips') {
      setSelectedCombinedOtherFilter('all_day_trips')
    } else {
      setSelectedCombinedOtherFilter('all_transportation')
    }
    setCurrentPage(1) // Reset to first page when filter changes
    setXsDisplayCount(itemsPerPage) // Reset xs display count when filter changes
  }

  const handleListGroupSizeFilterChange = (filterId: string) => {
    setSelectedListGroupSizeFilter(filterId)
    setCurrentPage(1) // Reset to first page when filter changes
    setXsDisplayCount(itemsPerPage) // Reset xs display count when filter changes
  }

  const handleCombinedOtherFilterChange = (filterId: string) => {
    setSelectedCombinedOtherFilter(filterId)
    setCurrentPage(1) // Reset to first page when filter changes
    setXsDisplayCount(itemsPerPage) // Reset xs display count when filter changes
  }

  const handleShowMore = () => {
    setXsDisplayCount(prev => prev + itemsPerPage)
  }

  // For xs screens, use xsDisplayCount; for larger screens, use pagination
  const displayedTripsXs = sortedTrips.slice(0, xsDisplayCount)

  const openMenu = () => {
    setIsMenuButtonAnimating(true)
    setTimeout(() => {
      setIsMenuButtonVisible(false)
      setIsMenuOpen(true)
      setTimeout(() => {
        setIsDrawerAnimating(false)
      }, 50)
    }, 150)
  }

  const closeMenu = () => {
    setIsDrawerAnimating(true)
    setTimeout(() => {
      setIsMenuOpen(false)
      setTimeout(() => {
        setIsMenuButtonVisible(true)
        setIsMenuButtonAnimating(true)
        setTimeout(() => {
          setIsMenuButtonAnimating(false)
        }, 50)
      }, 50)
    }, 150)
  }

  // Recent journeys carousel data (first 8 journeys)
  const recentTrips = useMemo(() => {
    return trips.slice(0, 8).map(trip => ({
      ...trip,
      duration: formatDuration(trip.days, trip.nights, tr)
    }))
  }, [trips, tr])

  const nextRecentJourneySlide = () => {
    setIsRecentJourneyTransitioning(true)
    setTimeout(() => {
      setCurrentRecentJourneySlide((prev) => (prev + 1) % recentTrips.length)
      setIsRecentJourneyTransitioning(false)
    }, 150)
  }

  const prevRecentJourneySlide = () => {
    setIsRecentJourneyTransitioning(true)
    setTimeout(() => {
      setCurrentRecentJourneySlide((prev) => (prev - 1 + recentTrips.length) % recentTrips.length)
      setIsRecentJourneyTransitioning(false)
    }, 150)
  }

  if (isLoading) {
    return (
      <>
      <style jsx>{`
        @keyframes moveRight {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 0%; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: rvw(32, 32),
          backgroundImage: 'url(/images/backgrounds/homepage_background_2.webp)',
          backgroundRepeat: 'repeat',
          backgroundSize: { xs: `${vw(200, 'mobile')} auto`, md: `${vw(200)} auto` },
          animation: { xs: 'moveRight 20s linear infinite', md: 'moveRight 60s linear infinite' }
        }}
      >
        {/* Spinner */}
        <Box
          sx={{
            width: rvw(60, 60),
            height: rvw(60, 60),
            borderWidth: rvw(6, 6),
            borderStyle: 'solid',
            borderColor: 'rgba(240, 96, 1, 0.2)',
            borderTopWidth: rvw(6, 6),
            borderTopStyle: 'solid',
            borderTopColor: '#F06001',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
        {/* Loading text */}
        <Box sx={{ fontFamily: locale === 'zh' ? 'MarioFontTitleChinese, sans-serif' : 'MarioFontTitle, sans-serif', fontSize: rvw(32, 32), color: '#373737', margin: 0 }}>
          {tr.loadingJourneys}
        </Box>
      </Box>
    </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <style jsx>{`
        .journey-search-input::placeholder {
          color: #F6F6F6;
        }
        @keyframes moveRight {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 0%; }
        }
        @keyframes slide-in {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-in-out forwards;
        }
      `}</style>
      <ViewHintsDrawer
        isOpen={isViewHintsDrawerOpen}
        onClose={() => setIsViewHintsDrawerOpen(false)}
      />
      <TransportationFilterDrawer
        isOpen={isTransportationFilterDrawerOpen}
        onClose={() => setIsTransportationFilterDrawerOpen(false)}
        selectedFilter={selectedTransportationFilter}
        onFilterChange={handleTransportationFilterChange}
      />
      <DayTripFilterDrawer
        isOpen={isDayTripFilterDrawerOpen}
        onClose={() => setIsDayTripFilterDrawerOpen(false)}
        selectedFilter={selectedDayTripFilter}
        onFilterChange={handleDayTripFilterChange}
      />
      <GroupSizeFilterDrawer
        isOpen={isGroupSizeFilterDrawerOpen}
        onClose={() => setIsGroupSizeFilterDrawerOpen(false)}
        selectedFilter={selectedGroupSizeFilter}
        onFilterChange={handleGroupSizeFilterChange}
      />
      <DayTripGroupSizeFilterDrawer
        isOpen={isDayTripGroupSizeFilterDrawerOpen}
        onClose={() => setIsDayTripGroupSizeFilterDrawerOpen(false)}
        selectedFilter={selectedDayTripGroupSizeFilter}
        onFilterChange={handleDayTripGroupSizeFilterChange}
      />
      <TripLengthFilterDrawer
        isOpen={isTripLengthFilterDrawerOpen}
        onClose={() => setIsTripLengthFilterDrawerOpen(false)}
        selectedFilter={selectedTripLengthFilter}
        onFilterChange={handleTripLengthFilterChange}
      />
      <ListGroupSizeFilterDrawer
        key={selectedTripLengthFilter}
        isOpen={isListGroupSizeFilterDrawerOpen}
        onClose={() => setIsListGroupSizeFilterDrawerOpen(false)}
        selectedFilter={selectedListGroupSizeFilter}
        onFilterChange={handleListGroupSizeFilterChange}
      />
      <CombinedOtherFilterDrawer
        isOpen={isCombinedOtherFilterDrawerOpen}
        onClose={() => setIsCombinedOtherFilterDrawerOpen(false)}
        tripLengthFilter={selectedTripLengthFilter}
        selectedFilter={selectedCombinedOtherFilter}
        onFilterChange={handleCombinedOtherFilterChange}
      />
      <NavigationMenu
        isMenuOpen={isMenuOpen}
        isMenuButtonVisible={isMenuButtonVisible}
        isDrawerAnimating={isDrawerAnimating}
        isMenuButtonAnimating={isMenuButtonAnimating}
        openMenu={openMenu}
        closeMenu={closeMenu}
        currentPage="trips"
      />

      {/* Journeys Page Title - Full Width */}
      <Box className="w-full">
        <Box
          component="img"
          src={`https://res.cloudinary.com/joey-hou-homepage/image/upload/w_1920,f_auto,q_auto/joeyhoujournal/headers/journeys_page_title_${locale}.jpg`}
          alt="Journeys"
          sx={{ display: { xs: 'none', md: 'block' }, width: '100%', height: 'auto', objectFit: 'cover' }}
        />
        <Box
          component="img"
          src={`https://res.cloudinary.com/joey-hou-homepage/image/upload/w_800,f_auto,q_auto/joeyhoujournal/headers/journey_page_title_xs_${locale}.jpg`}
          alt="Journeys"
          sx={{ display: { xs: 'block', md: 'none' }, width: '100%', height: 'auto', objectFit: 'cover' }}
        />
      </Box>

      {/* Recent Journeys Carousel Section */}
      {recentTrips.length > 0 && (
      <Box
        component="section"
        className="w-full"
        sx={{
          paddingTop: rvw(48, 96),
          paddingBottom: rvw(48, 96),
          backgroundImage: 'url(/images/backgrounds/homepage_background_2.webp)',
          backgroundRepeat: 'repeat',
          backgroundSize: { xs: `${vw(200, 'mobile')} auto`, md: `${vw(200)} auto` },
          animation: { xs: 'moveRight 20s linear infinite', md: 'moveRight 60s linear infinite' },
        }}
      >
        <Box sx={{ maxWidth: { xs: 'none', md: vw(1280) }, marginLeft: 'auto', marginRight: 'auto', paddingLeft: rvw(16, 32), paddingRight: rvw(16, 32) }}>
          {/* Desktop: Title and Description */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: vw(64), marginTop: vw(32) }}>
            <MixedText
              text={locale === 'zh' ? '最新旅程' : 'Recent Journeys'}
              chineseFont="MarioFontTitleChinese, sans-serif"
              englishFont="MarioFontTitle, sans-serif"
              fontSize={vw(64)}
              color="#373737"
              component="h2"
              sx={{
                margin: 0,
                marginBottom: vw(16)
              }}
            />
            <MixedText
              text={locale === 'zh' ? '来看我最近几次的旅程吧！' : 'Browse my most recent journeys!'}
              chineseFont="MarioFontChinese, sans-serif"
              englishFont="MarioFont, sans-serif"
              fontSize={vw(28)}
              color="#373737"
              component="p"
              sx={{ margin: 0, textAlign: 'center' }}
            />
          </Box>

          {/* Mobile: Title and Description */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: vw(64, 'mobile'), marginTop: vw(16, 'mobile') }}>
            <MixedText
              text={locale === 'zh' ? '最新旅程' : 'Recent Journeys'}
              chineseFont="MarioFontTitleChinese, sans-serif"
              englishFont="MarioFontTitle, sans-serif"
              fontSize={vw(40, 'mobile')}
              color="#373737"
              component="h3"
              sx={{
                margin: 0,
                marginBottom: vw(8, 'mobile')
              }}
            />
            <MixedText
              text={locale === 'zh' ? '来看我最近几次的旅程吧！' : 'Browse my most recent journeys!'}
              chineseFont="MarioFontChinese, sans-serif"
              englishFont="MarioFont, sans-serif"
              fontSize={vw(16, 'mobile')}
              color="#373737"
              component="p"
              sx={{
                margin: 0,
                textAlign: 'center',
                paddingX: vw(16, 'mobile')
              }}
            />
          </Box>

          {/* XS Layout - Card Style */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, position: 'relative', width: '100vw', left: '50%', marginLeft: '-50vw', minHeight: vw(500, 'mobile'), zIndex: 10, padding: 0 }}>
            <Box sx={{ position: 'relative', width: '100vw', margin: '0', padding: '0', display: 'flex', flexDirection: 'column-reverse', overflow: 'visible' }}>
              {/* Journey Image */}
              <Box
                sx={{
                  position: 'relative',
                  width: '75%',
                  aspectRatio: '1',
                  borderRadius: vw(20, 'mobile'),
                  overflow: 'hidden',
                  zIndex: 10,
                  boxShadow: `0 ${vw(4, 'mobile')} ${vw(6, 'mobile')} rgba(0, 0, 0, 0.1)`,
                  marginTop: vw(-48, 'mobile'),
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
              >
                <Box
                  component="img"
                  src={recentTrips[currentRecentJourneySlide]?.image || ''}
                  alt={recentTrips[currentRecentJourneySlide]?.name}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>

              {/* Card Background */}
              <Box sx={{ position: 'relative', zIndex: 5 }}>
                <Box
                  component="img"
                  src="/images/destinations/destination_card_xs_odd.webp"
                  alt="Card"
                  sx={{ width: '100vw', height: 'auto', display: 'block' }}
                />
              </Box>

              {/* Title Section */}
              <Box sx={{ position: 'absolute', top: '0%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', overflow: 'visible', zIndex: 15 }}>
                <Box
                  component="img"
                  src="/images/destinations/destination_location_title.webp"
                  alt="Location"
                  sx={{ width: '100%', height: 'auto', display: 'block' }}
                />
                <MixedText
                  text={locale === 'zh' && recentTrips[currentRecentJourneySlide]?.nameCN ? recentTrips[currentRecentJourneySlide]?.nameCN : recentTrips[currentRecentJourneySlide]?.name || ''}
                  chineseFont="MarioFontTitleChinese, sans-serif"
                  englishFont="MarioFontTitle, sans-serif"
                  fontSize={vw(28, 'mobile')}
                  color="#373737"
                  component="h3"
                  sx={{
                    margin: 0,
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    width: '100%'
                  }}
                />
              </Box>

              {/* Route Info */}
              <Box sx={{ position: 'absolute', top: '10%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', textAlign: 'center', zIndex: 15 }}>
                <Box component="p" sx={{ fontFamily: locale === 'zh' ? 'MarioFontChinese, sans-serif' : 'MarioFont, sans-serif', fontSize: vw(16, 'mobile'), color: '#F6F6F6', marginBottom: 0, marginTop: 0, lineHeight: '1.4' }}>
                  {recentTrips[currentRecentJourneySlide]?.route || ''}
                </Box>
              </Box>

              {/* View Details Button */}
              <Link href={`/journeys/${recentTrips[currentRecentJourneySlide]?.slug || ''}`}>
                <Box sx={{ position: 'absolute', top: '19%', left: '50%', transform: 'translate(-50%, -50%) scale(1.3)', zIndex: 15 }}>
                  <Box
                    component="img"
                    src={`/images/buttons/view_details_button_${locale}.png`}
                    alt="View Details"
                    className="w-auto hover:scale-105 transition-transform duration-200"
                    sx={{ height: vw(48, 'mobile'), objectFit: 'contain', display: 'block' }}
                  />
                </Box>
              </Link>
            </Box>

            {/* Navigation Arrows */}
            <Box
              component="button"
              onClick={prevRecentJourneySlide}
              disabled={currentRecentJourneySlide === 0}
              className={`group absolute left-0 transition-transform duration-200 ${currentRecentJourneySlide === 0 ? 'opacity-40' : 'cursor-pointer'}`}
              sx={{ zIndex: 30, top: '50%', transform: 'translateY(-50%)' }}
            >
              <Box
                component="img"
                src="/images/buttons/tab_prev.webp"
                alt="Previous"
                className={`w-auto ${currentRecentJourneySlide === 0 ? '' : 'group-hover:hidden'}`}
                sx={{ height: vw(96, 'mobile') }}
              />
              {currentRecentJourneySlide !== 0 && (
                <Box
                  component="img"
                  src="/images/buttons/tab_prev_hover.webp"
                  alt="Previous"
                  className="w-auto hidden group-hover:block"
                  sx={{ height: vw(96, 'mobile') }}
                />
              )}
            </Box>
            <Box
              component="button"
              onClick={nextRecentJourneySlide}
              disabled={currentRecentJourneySlide === recentTrips.length - 1}
              className={`group absolute right-0 transition-transform duration-200 ${currentRecentJourneySlide === recentTrips.length - 1 ? 'opacity-40' : 'cursor-pointer'}`}
              sx={{ zIndex: 30, top: '50%', transform: 'translateY(-50%)' }}
            >
              <Box
                component="img"
                src="/images/buttons/tab_next.webp"
                alt="Next"
                className={`w-auto ${currentRecentJourneySlide === recentTrips.length - 1 ? '' : 'group-hover:hidden'}`}
                sx={{ height: vw(96, 'mobile') }}
              />
              {currentRecentJourneySlide !== recentTrips.length - 1 && (
                <Box
                  component="img"
                  src="/images/buttons/tab_next_hover.webp"
                  alt="Next"
                  className="w-auto hidden group-hover:block"
                  sx={{ height: vw(96, 'mobile') }}
                />
              )}
            </Box>

            {/* Slide Indicators */}
            <Box className="absolute left-1/2 -translate-x-1/2" sx={{ zIndex: 25, bottom: vw(32, 'mobile') }}>
              <Box className="flex justify-center" sx={{ gap: vw(8, 'mobile') }}>
                {recentTrips.map((_, index) => (
                  <Box
                    key={index}
                    component="button"
                    onClick={() => setCurrentRecentJourneySlide(index)}
                    className={`rounded-full transition-colors duration-200 ${
                      index === currentRecentJourneySlide ? 'bg-[#373737]' : 'bg-[#373737]/30'
                    }`}
                    sx={{ width: vw(12, 'mobile'), height: vw(12, 'mobile') }}
                  />
                ))}
              </Box>
            </Box>
          </Box>

          {/* MD+ Layout - Desktop Carousel */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'relative',
              width: '100vw',
              left: '50%',
              marginLeft: '-50vw',
              marginTop: vw(32),
              aspectRatio: '1920/800'
            }}
          >
            {/* Background with mask */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'url(/images/journey/homepage_journey_slide_background.avif)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                WebkitMaskImage: 'url(/images/masks/homepage_journey_slide_mask.webp)',
                maskImage: 'url(/images/masks/homepage_journey_slide_mask.webp)',
                WebkitMaskSize: '100% 100%',
                maskSize: '100% 100%',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                zIndex: 0,
              }}
            />

            {/* Masked journey image - left edge */}
            <Box sx={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 30 }}>
              <Box
                className={`transition-transform duration-300 ease-in-out ${
                  isRecentJourneyTransitioning ? '-translate-x-full' : 'translate-x-0'
                }`}
                sx={{
                  width: vw(768),
                  height: vw(768),
                  backgroundImage: `url(${recentTrips[currentRecentJourneySlide]?.image || ''})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  WebkitMaskImage: 'url(/images/masks/homepage_journey_image_mask.webp)',
                  maskImage: 'url(/images/masks/homepage_journey_image_mask.webp)',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center'
                }}
              />
              {isRecentJourneyTransitioning && (
                <Box
                  className="absolute top-0 left-0 transition-transform duration-300 ease-in-out -translate-x-full animate-slide-in"
                  sx={{
                    width: vw(768),
                    height: vw(768),
                    backgroundImage: `url(${recentTrips[currentRecentJourneySlide]?.image || ''})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    WebkitMaskImage: 'url(/images/masks/homepage_journey_image_mask.webp)',
                    maskImage: 'url(/images/masks/homepage_journey_image_mask.webp)',
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center'
                  }}
                />
              )}
            </Box>

            {/* Journey Card Overlay */}
            <Box
              className="absolute top-1/2 -translate-y-1/3"
              sx={{
                left: vw(250),
                zIndex: 25,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: vw(24)
              }}
            >
              <Box sx={{ position: 'relative', width: vw(1100) }}>
                <Box
                  component="img"
                  src="/images/destinations/destination_popup_card.webp"
                  alt="Card"
                  sx={{ width: vw(1100), height: 'auto', display: 'block' }}
                />
                <Box sx={{ position: 'absolute', top: '0%', left: '70%', transform: 'translate(-50%, -50%)', width: '65%' }}>
                  <Box
                    component="img"
                    src="/images/journey/journeys_map_description_title.webp"
                    alt="Location"
                    sx={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                  <MixedText
                    text={locale === 'zh' && recentTrips[currentRecentJourneySlide]?.nameCN ? recentTrips[currentRecentJourneySlide]?.nameCN : recentTrips[currentRecentJourneySlide]?.name || ''}
                    chineseFont="MarioFontTitleChinese, sans-serif"
                    englishFont="MarioFontTitle, sans-serif"
                    fontSize={vw(40)}
                    color="#373737"
                    component="h3"
                    sx={{
                      margin: 0,
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      width: '100%'
                    }}
                  />
                </Box>
                <Box sx={{ position: 'absolute', top: '60%', left: '70%', transform: 'translate(-50%, -50%)', width: '50%', textAlign: 'center' }}>
                  <MixedText
                    text={recentTrips[currentRecentJourneySlide]?.route || ''}
                    chineseFont="MarioFontChinese, sans-serif"
                    englishFont="MarioFont, sans-serif"
                    fontSize={vw(28)}
                    color="#373737"
                    component="p"
                    sx={{ marginBottom: vw(4), marginTop: 0 }}
                  />
                  <MixedText
                    text={recentTrips[currentRecentJourneySlide]?.duration || ''}
                    chineseFont="MarioFontChinese, sans-serif"
                    englishFont="MarioFont, sans-serif"
                    fontSize={vw(26)}
                    color="#373737"
                    component="p"
                    sx={{ marginBottom: 0, marginTop: 0 }}
                  />
                </Box>
              </Box>
              <Box
                component="a"
                href={`/journeys/${recentTrips[currentRecentJourneySlide]?.slug || ''}`}
                className="inline-block hover:scale-105 transition-transform duration-200"
                sx={{ marginLeft: vw(400) }}
              >
                <Box
                  component="img"
                  src={`/images/buttons/view_details_button_${locale}.png`}
                  alt="View Details"
                  sx={{ height: vw(70), width: 'auto', display: 'block', objectFit: 'contain' }}
                />
              </Box>
            </Box>

            {/* Navigation Arrows */}
            <Box
              component="button"
              onClick={prevRecentJourneySlide}
              disabled={currentRecentJourneySlide === 0}
              className={`group absolute top-1/2 -translate-y-1/2 transition-transform duration-200 ${currentRecentJourneySlide === 0 ? 'opacity-40' : 'hover:scale-110'}`}
              sx={{ zIndex: 30, left: vw(32), padding: vw(24) }}
            >
              <Box component="img" src="/images/buttons/arrow_prev.webp" alt="Previous" className={`${currentRecentJourneySlide === 0 ? '' : 'group-hover:hidden'}`} sx={{ width: vw(64), height: vw(64) }} />
              <Box component="img" src="/images/buttons/arrow_prev_hover.webp" alt="Previous" className={`${currentRecentJourneySlide === 0 ? 'hidden' : 'hidden group-hover:block'}`} sx={{ width: vw(64), height: vw(64) }} />
            </Box>
            <Box
              component="button"
              onClick={nextRecentJourneySlide}
              disabled={currentRecentJourneySlide === recentTrips.length - 1}
              className={`group absolute top-1/2 -translate-y-1/2 transition-transform duration-200 ${currentRecentJourneySlide === recentTrips.length - 1 ? 'opacity-40' : 'hover:scale-110'}`}
              sx={{ zIndex: 30, right: vw(32), padding: vw(24) }}
            >
              <Box component="img" src="/images/buttons/arrow_next.webp" alt="Next" className={`${currentRecentJourneySlide === recentTrips.length - 1 ? '' : 'group-hover:hidden'}`} sx={{ width: vw(64), height: vw(64) }} />
              <Box component="img" src="/images/buttons/arrow_next_hover.webp" alt="Next" className={`${currentRecentJourneySlide === recentTrips.length - 1 ? 'hidden' : 'hidden group-hover:block'}`} sx={{ width: vw(64), height: vw(64) }} />
            </Box>

            {/* Slide Indicators */}
            <Box className="absolute left-1/2 -translate-x-1/2" sx={{ zIndex: 25, bottom: vw(32) }}>
              <Box className="flex justify-center" sx={{ gap: vw(8) }}>
                {recentTrips.map((_, index) => (
                  <Box
                    key={index}
                    component="button"
                    onClick={() => setCurrentRecentJourneySlide(index)}
                    className={`rounded-full transition-colors duration-200 ${
                      index === currentRecentJourneySlide ? 'bg-[#373737]' : 'bg-[#373737]/30'
                    }`}
                    sx={{ width: vw(12), height: vw(12) }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      )}

      {/* Long Trips Map Section */}
      <Box
        component="section"
        className="w-full"
        sx={{
          paddingTop: rvw(48, 96),
          paddingBottom: rvw(48, 96),
          backgroundImage: 'url(/images/destinations/destination_page_map_background.webp)',
          backgroundRepeat: 'repeat',
          backgroundSize: { xs: `${vw(300, 'mobile')} auto`, md: `${vw(300)} auto` },
        }}
      >
        <Box sx={{ maxWidth: { xs: 'none', md: vw(1280) }, marginLeft: 'auto', marginRight: 'auto', paddingLeft: rvw(16, 32), paddingRight: rvw(16, 32) }}>
          {/* Desktop: Long Trips Title and Description */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: vw(64), marginTop: vw(32) }}>
            <MixedText
              text={locale === 'zh' ? '长途旅行' : 'Long Trips'}
              chineseFont="MarioFontTitleChinese, sans-serif"
              englishFont="MarioFontTitle, sans-serif"
              fontSize={vw(64)}
              color="#F6F6F6"
              component="h2"
              sx={{
                textShadow: `${vw(3)} ${vw(3)} 0px #373737`,
                margin: 0,
                marginBottom: vw(16)
              }}
            />
            <MixedText
              text={locale === 'zh' ? '使用地图两侧的按钮，来看我的更多旅行吧！' : 'Use left and right buttons on the side to view more trips!'}
              chineseFont="MarioFontChinese, sans-serif"
              englishFont="MarioFont, sans-serif"
              fontSize={vw(28)}
              color="#F6F6F6"
              component="p"
              sx={{ margin: 0, textAlign: 'center' }}
            />
          </Box>

          {/* Mobile: Long Trips Title and Description */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: vw(32, 'mobile'), marginTop: vw(16, 'mobile') }}>
            <MixedText
              text={locale === 'zh' ? '长途旅行' : 'Long Trips'}
              chineseFont="MarioFontTitleChinese, sans-serif"
              englishFont="MarioFontTitle, sans-serif"
              fontSize={vw(40, 'mobile')}
              color="#F6F6F6"
              component="h3"
              sx={{
                textShadow: `${vw(2, 'mobile')} ${vw(2, 'mobile')} 0px #373737`,
                margin: 0,
                marginBottom: vw(8, 'mobile')
              }}
            />
            <MixedText
              text={locale === 'zh' ? '使用屏幕两侧的按钮，来看我的更多旅行吧！' : 'Use left and right buttons on the side to view more trips!'}
              chineseFont="MarioFontChinese, sans-serif"
              englishFont="MarioFont, sans-serif"
              fontSize={vw(16, 'mobile')}
              color="#F6F6F6"
              component="p"
              sx={{
                margin: 0,
                textAlign: 'center',
                paddingX: vw(16, 'mobile')
              }}
            />
          </Box>

          {/* Mobile: View Hints Button */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', alignItems: 'center', marginBottom: vw(48, 'mobile') }}>
            <button
              onClick={() => setIsViewHintsDrawerOpen(true)}
              className="hover:scale-105 transition-transform duration-200"
            >
              <img
                src={`/images/buttons/view_hints_button_${locale}.png`}
                alt="View Hints"
                className="w-auto"
                style={{ height: vw(64, 'mobile') }}
              />
            </button>
          </Box>

          {/* View Hints Button - Desktop Only */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', marginBottom: vw(192), marginTop: vw(64) }}>
            <button
              onClick={() => setIsViewHintsDrawerOpen(true)}
              className="hover:scale-105 transition-transform duration-200"
            >
              <img
                src={`/images/buttons/view_hints_button_${locale}.png`}
                alt="View Hints"
                className="w-auto"
                style={{ height: vw(80) }}
              />
            </button>
          </Box>

          {/* Journey Info Card - Above map on xs screens */}
          {currentJourney && (
            <Box sx={{ display: { xs: 'block', md: 'none' }, marginTop: vw(48, 'mobile') }}>
              <MapViewHint
                imageOnRight={true}
                cardNumber={2}
                isJourneyInfo={true}
                journeySlug={currentJourney.slug}
                station={{
                  id: '',
                  name: locale === 'zh' && currentJourney.nameCN ? currentJourney.nameCN : currentJourney.name,
                  journeyName: currentJourneyRoute,
                  date: formatDuration(currentJourney.days, currentJourney.nights, tr),
                  images: []
                }}
              />
            </Box>
          )}

          {currentJourney && (
            <Box sx={{ position: 'relative', marginX: { xs: vw(-8, 'mobile'), md: 0 }, marginTop: { xs: vw(-24, 'mobile'), md: 0 } }}>
              <Box
                sx={{
                  backgroundImage: 'url(/images/destinations/destination_page_map_box_background.webp)',
                  backgroundRepeat: 'repeat',
                  backgroundSize: { xs: `${vw(200, 'mobile')} auto`, md: `${vw(200)} auto` },
                  padding: { xs: vw(8, 'mobile'), md: vw(16) },
                  borderRadius: { xs: vw(12, 'mobile'), md: vw(24) }
                }}
              >
                <InteractiveMap
                  places={currentJourneyPlaces}
                  routeSegments={currentJourney?.segments}
                  routeCoordinates={currentJourneyRouteCoordinates}
                  journeyDate={currentJourney?.startDate}
                />
              </Box>

              {/* Journey Info Card - Top Right Corner on desktop only */}
              <Box
                sx={{
                  display: { xs: 'none', md: 'block' },
                  position: 'absolute',
                  top: vw(-100),
                  right: vw(-600),
                  zIndex: 1000
                }}
              >
                <MapViewHint
                  imageOnRight={true}
                  cardNumber={2}
                  isJourneyInfo={true}
                  journeySlug={currentJourney.slug}
                  station={{
                    id: '',
                    name: locale === 'zh' && currentJourney.nameCN ? currentJourney.nameCN : currentJourney.name,
                    journeyName: currentJourneyRoute,
                    date: formatDuration(currentJourney.days, currentJourney.nights, tr),
                    images: []
                  }}
                />
              </Box>

              {/* Previous Button */}
              <Box
                component="button"
                onClick={handlePrevJourney}
                disabled={currentJourneyIndex === 0}
                className={`group absolute top-[50%] translate-y-[-50%] z-[1001] transition-transform duration-200 ${
                  currentJourneyIndex === 0 ? 'opacity-40 cursor-default' : 'hover:scale-105 cursor-pointer'
                }`}
                sx={{ left: { xs: vw(-8, 'mobile'), md: vw(16) } }}
              >
                <Box
                  component="img"
                  src="/images/buttons/tab_prev.webp"
                  alt={tr.previousJourney}
                  className={`w-auto ${currentJourneyIndex === 0 ? '' : 'group-hover:hidden'}`}
                  sx={{ height: rvw(96, 96) }}
                />
                <Box
                  component="img"
                  src="/images/buttons/tab_prev_hover.webp"
                  alt={tr.previousJourney}
                  className={`w-auto ${currentJourneyIndex === 0 ? 'hidden' : 'hidden group-hover:block'}`}
                  sx={{ height: rvw(96, 96) }}
                />
              </Box>

              {/* Next Button */}
              <Box
                component="button"
                onClick={handleNextJourney}
                disabled={currentJourneyIndex === regularJourneys.length - 1}
                className={`group absolute top-[50%] translate-y-[-50%] z-[1001] transition-transform duration-200 ${
                  currentJourneyIndex === regularJourneys.length - 1 ? 'opacity-40 cursor-default' : 'hover:scale-105 cursor-pointer'
                }`}
                sx={{ right: { xs: vw(-8, 'mobile'), md: vw(16) } }}
              >
                <Box
                  component="img"
                  src="/images/buttons/tab_next.webp"
                  alt={tr.nextJourney}
                  className={`w-auto ${currentJourneyIndex === regularJourneys.length - 1 ? '' : 'group-hover:hidden'}`}
                  sx={{ height: rvw(96, 96) }}
                />
                <Box
                  component="img"
                  src="/images/buttons/tab_next_hover.webp"
                  alt={tr.nextJourney}
                  className={`w-auto ${currentJourneyIndex === regularJourneys.length - 1 ? 'hidden' : 'hidden group-hover:block'}`}
                  sx={{ height: rvw(96, 96) }}
                />
              </Box>
            </Box>
          )}

          {/* Filter Buttons - Mobile Only - Below Map */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', alignItems: 'center', marginTop: vw(48, 'mobile'), width: '100%' }}>
            {/* Long Trips Filters Label */}
            <MixedText
              text={locale === 'zh' ? '长途旅行筛选条件' : 'Long Trips Filters'}
              chineseFont="MarioFontTitleChinese, sans-serif"
              englishFont="MarioFontTitle, sans-serif"
              fontSize={vw(24, 'mobile')}
              color="#F6F6F6"
              component="p"
              sx={{
                textShadow: `${vw(2, 'mobile')} ${vw(2, 'mobile')} 0px #373737`,
                margin: 0
              }}
            />
            <div
              className="flex justify-center items-center"
              style={{
                backgroundImage: 'url(/images/backgrounds/filter_desktop_background.png)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                height: vw(100, 'mobile'),
                width: '100%',
                maxWidth: vw(400, 'mobile'),
                gap: vw(16, 'mobile')
              }}
            >
              {/* Transportation Filter Button */}
              <button
                onClick={() => setIsTransportationFilterDrawerOpen(true)}
                className="hover:scale-105 transition-transform duration-200"
              >
                <img
                  src={transportationFilterIconMap[selectedTransportationFilter] || transportationFilterIconMap['all_transportation']}
                  alt={locale === 'zh' ? '以交通方式筛选' : 'Filter by Transportation'}
                  className="w-auto"
                  style={{
                    height: vw(64, 'mobile'),
                    filter: selectedTransportationFilter !== 'all_transportation' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                  }}
                />
              </button>

              {/* Group Size Filter Button */}
              <button
                onClick={() => setIsGroupSizeFilterDrawerOpen(true)}
                className="hover:scale-105 transition-transform duration-200"
              >
                <img
                  src={longTripGroupSizeFilterIconMap[selectedGroupSizeFilter] || longTripGroupSizeFilterIconMap['all_group_sizes']}
                  alt={locale === 'zh' ? '用人数筛选' : 'Filter by Group Size'}
                  className="w-auto"
                  style={{
                    height: vw(64, 'mobile'),
                    filter: selectedGroupSizeFilter !== 'all_group_sizes' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                  }}
                />
              </button>
            </div>
          </Box>

          {/* Filter Buttons - Desktop Only - Long Trips */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', alignItems: 'center', marginTop: vw(64) }}>
            {/* Long Trips Filters Label */}
            <MixedText
              text={locale === 'zh' ? '长途旅行筛选条件' : 'Long Trips Filters'}
              chineseFont="MarioFontTitleChinese, sans-serif"
              englishFont="MarioFontTitle, sans-serif"
              fontSize={vw(24)}
              color="#F6F6F6"
              component="p"
              sx={{
                textShadow: `${vw(2)} ${vw(2)} 0px #373737`,
                margin: 0,
                marginBottom: vw(8)
              }}
            />
            <div
              className="flex justify-center items-center"
              style={{
                backgroundImage: 'url(/images/backgrounds/filter_desktop_background.png)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                height: vw(140),
                width: '100%',
                maxWidth: vw(900),
                gap: vw(32)
              }}
            >
              {/* Transportation Filter Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsTransportationFilterDrawerOpen(true)}
                  onMouseEnter={() => setIsTransportationFilterHovered(true)}
                  onMouseLeave={() => setIsTransportationFilterHovered(false)}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={transportationFilterIconMap[selectedTransportationFilter] || transportationFilterIconMap['all_transportation']}
                    alt={locale === 'zh' ? '以交通方式筛选' : 'Filter by Transportation'}
                    className="w-auto"
                    style={{
                      height: vw(96),
                      filter: selectedTransportationFilter !== 'all_transportation' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                    }}
                  />
                </button>
                {isTransportationFilterHovered && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: vw(8),
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <MixedText
                      text={locale === 'zh' ? '以交通方式筛选' : 'Filter by Transportation'}
                      chineseFont="MarioFontTitleChinese, sans-serif"
                      englishFont="MarioFontTitle, sans-serif"
                      fontSize={vw(24)}
                      color="#F6F6F6"
                      component="p"
                      sx={{
                        textShadow: `${vw(2)} ${vw(2)} 0px #373737`,
                        margin: 0
                      }}
                    />
                  </Box>
                )}
              </div>

              {/* Group Size Filter Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsGroupSizeFilterDrawerOpen(true)}
                  onMouseEnter={() => setIsLongTripGroupSizeFilterHovered(true)}
                  onMouseLeave={() => setIsLongTripGroupSizeFilterHovered(false)}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={longTripGroupSizeFilterIconMap[selectedGroupSizeFilter] || longTripGroupSizeFilterIconMap['all_group_sizes']}
                    alt={locale === 'zh' ? '用人数筛选' : 'Filter by Group Size'}
                    className="w-auto"
                    style={{
                      height: vw(96),
                      filter: selectedGroupSizeFilter !== 'all_group_sizes' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                    }}
                  />
                </button>
                {isLongTripGroupSizeFilterHovered && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: vw(8),
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <MixedText
                      text={locale === 'zh' ? '用人数筛选' : 'Filter by Group Size'}
                      chineseFont="MarioFontTitleChinese, sans-serif"
                      englishFont="MarioFontTitle, sans-serif"
                      fontSize={vw(24)}
                      color="#F6F6F6"
                      component="p"
                      sx={{
                        textShadow: `${vw(2)} ${vw(2)} 0px #373737`,
                        margin: 0
                      }}
                    />
                  </Box>
                )}
              </div>
            </div>
          </Box>
        </Box>
      </Box>

      {/* Day Trips & Weekend Trips Section - Desktop Only */}
      {dayTripJourneys.length > 0 && currentDayTrip && (
        <Box
          component="section"
          className="w-full"
          sx={{
            display: { xs: 'none', md: 'block' },
            paddingTop: vw(96),
            paddingBottom: vw(96),
            backgroundImage: 'url(/images/backgrounds/homepage_background.webp)',
            backgroundRepeat: 'repeat',
            backgroundSize: '100vw auto',
          }}
        >
          <Box sx={{ maxWidth: vw(1280), marginLeft: 'auto', marginRight: 'auto', paddingLeft: vw(32), paddingRight: vw(32) }}>
            {/* Desktop: Day Trips Title and Description */}
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: vw(64), marginTop: vw(32) }}>
              <MixedText
                text={locale === 'zh' ? '一日游 & 周末旅行' : 'Day Trips & Weekend Trips'}
                chineseFont="MarioFontTitleChinese, sans-serif"
                englishFont="MarioFontTitle, sans-serif"
                fontSize={vw(64)}
                color="#F6F6F6"
                component="h2"
                sx={{
                  textShadow: `${vw(3)} ${vw(3)} 0px #373737`,
                  margin: 0,
                  marginBottom: vw(16)
                }}
              />
              <MixedText
                text={locale === 'zh' ? '使用地图两侧的按钮，来看我的更多旅行吧！' : 'Use left and right buttons on the side to view more trips!'}
                chineseFont="MarioFontChinese, sans-serif"
                englishFont="MarioFont, sans-serif"
                fontSize={vw(28)}
                color="#F6F6F6"
                component="p"
                sx={{ margin: 0, textAlign: 'center' }}
              />
            </Box>

            {/* View Hints Button - Desktop Only */}
            <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: vw(192), marginTop: vw(64) }}>
              <button
                onClick={() => setIsViewHintsDrawerOpen(true)}
                className="hover:scale-105 transition-transform duration-200"
              >
                <img
                  src={`/images/buttons/view_hints_button_${locale}.png`}
                  alt="View Hints"
                  style={{ height: vw(80), width: 'auto' }}
                />
              </button>
            </Box>

            <Box style={{ position: 'relative' }}>
              <Box
                sx={{
                  backgroundImage: 'url(/images/destinations/destination_page_map_box_background.webp)',
                  backgroundRepeat: 'repeat',
                  backgroundSize: `${vw(200)} auto`,
                  padding: vw(16),
                  borderRadius: vw(24)
                }}
              >
                <InteractiveMap
                  places={currentDayTripPlaces}
                  routeSegments={currentDayTrip?.segments}
                  routeCoordinates={currentDayTripRouteCoordinates}
                  journeyDate={currentDayTrip?.startDate}
                />
              </Box>

              {/* Day Trip Info Card - Top Left Corner */}
              <Box
                sx={{
                  position: 'absolute',
                  top: vw(-100),
                  left: vw(-600),
                  zIndex: 1000
                }}
              >
                <MapViewHint
                  imageOnRight={false}
                  cardNumber={3}
                  isJourneyInfo={true}
                  journeySlug={currentDayTrip.slug}
                  station={{
                    id: '',
                    name: locale === 'zh' && currentDayTrip.nameCN ? currentDayTrip.nameCN : currentDayTrip.name,
                    journeyName: currentDayTripRoute,
                    date: formatDuration(currentDayTrip.days, currentDayTrip.nights, tr),
                    images: []
                  }}
                />
              </Box>

              {/* Previous Button */}
              <Box
                component="button"
                onClick={handlePrevDayTrip}
                disabled={currentDayTripIndex === 0}
                className={`group ${
                  currentDayTripIndex === 0 ? 'opacity-40 cursor-default' : 'cursor-pointer'
                }`}
                sx={{
                  position: 'absolute',
                  left: vw(16),
                  top: '50%',
                  transform: 'translateY(-50%)',
                  transition: 'transform 0.2s',
                  '&:not(:disabled):hover': { transform: 'translateY(-50%) scale(1.05)' },
                  zIndex: 1001,
                  background: 'none',
                  border: 'none',
                  padding: 0
                }}
              >
                <img
                  src="/images/buttons/tab_prev.webp"
                  alt={tr.previousJourney}
                  className={`${currentDayTripIndex === 0 ? '' : 'group-hover:hidden'}`}
                  style={{ height: vw(96), width: 'auto' }}
                />
                <img
                  src="/images/buttons/tab_prev_hover.webp"
                  alt={tr.previousJourney}
                  className={`${currentDayTripIndex === 0 ? 'hidden' : 'hidden group-hover:block'}`}
                  style={{ height: vw(96), width: 'auto' }}
                />
              </Box>

              {/* Next Button */}
              <Box
                component="button"
                onClick={handleNextDayTrip}
                disabled={currentDayTripIndex === dayTripJourneys.length - 1}
                className={`group ${
                  currentDayTripIndex === dayTripJourneys.length - 1 ? 'opacity-40 cursor-default' : 'cursor-pointer'
                }`}
                sx={{
                  position: 'absolute',
                  right: vw(16),
                  top: '50%',
                  transform: 'translateY(-50%)',
                  transition: 'transform 0.2s',
                  '&:not(:disabled):hover': { transform: 'translateY(-50%) scale(1.05)' },
                  zIndex: 1001,
                  background: 'none',
                  border: 'none',
                  padding: 0
                }}
              >
                <img
                  src="/images/buttons/tab_next.webp"
                  alt={tr.nextJourney}
                  className={`${currentDayTripIndex === dayTripJourneys.length - 1 ? '' : 'group-hover:hidden'}`}
                  style={{ height: vw(96), width: 'auto' }}
                />
                <img
                  src="/images/buttons/tab_next_hover.webp"
                  alt={tr.nextJourney}
                  className={`${currentDayTripIndex === dayTripJourneys.length - 1 ? 'hidden' : 'hidden group-hover:block'}`}
                  style={{ height: vw(96), width: 'auto' }}
                />
              </Box>
            </Box>

            {/* Filter Buttons - Desktop Only - Day Trips */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: vw(64) }}>
              {/* Day Trips & Weekend Trips Filters Label */}
              <MixedText
                text={locale === 'zh' ? '一日游&周末旅行筛选条件' : 'Day Trips & Weekend Trips Filters'}
                chineseFont="MarioFontTitleChinese, sans-serif"
                englishFont="MarioFontTitle, sans-serif"
                fontSize={vw(24)}
                color="#F6F6F6"
                component="p"
                sx={{
                  textShadow: `${vw(2)} ${vw(2)} 0px #373737`,
                  margin: 0,
                  marginBottom: vw(8)
                }}
              />
              <div
                className="flex justify-center items-center"
                style={{
                  backgroundImage: 'url(/images/backgrounds/filter_desktop_background_yellow.png)',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  height: vw(140),
                  width: '100%',
                  maxWidth: vw(900),
                  gap: vw(32)
                }}
              >
                {/* Day Trip Group Size Filter Button */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setIsDayTripGroupSizeFilterDrawerOpen(true)}
                    onMouseEnter={() => setIsDayTripGroupSizeFilterHovered(true)}
                    onMouseLeave={() => setIsDayTripGroupSizeFilterHovered(false)}
                    className="hover:scale-105 transition-transform duration-200"
                  >
                    <img
                      src={dayTripGroupSizeFilterIconMap[selectedDayTripGroupSizeFilter] || dayTripGroupSizeFilterIconMap['all_day_trip_group_sizes']}
                      alt={locale === 'zh' ? '用人数筛选' : 'Filter by Group Size'}
                      style={{ height: vw(96), width: 'auto', filter: selectedDayTripGroupSizeFilter !== 'all_day_trip_group_sizes' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none' }}
                    />
                  </button>
                  {isDayTripGroupSizeFilterHovered && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: vw(8),
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <MixedText
                        text={locale === 'zh' ? '用人数筛选' : 'Filter by Group Size'}
                        chineseFont="MarioFontTitleChinese, sans-serif"
                        englishFont="MarioFontTitle, sans-serif"
                        fontSize={vw(24)}
                        color="#F6F6F6"
                        component="p"
                        sx={{
                          textShadow: `${vw(2)} ${vw(2)} 0px #373737`,
                          margin: 0
                        }}
                      />
                    </Box>
                  )}
                </div>

                {/* Day Trip Location Filter Button */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setIsDayTripFilterDrawerOpen(true)}
                    onMouseEnter={() => setIsDayTripLocationFilterHovered(true)}
                    onMouseLeave={() => setIsDayTripLocationFilterHovered(false)}
                    className="hover:scale-105 transition-transform duration-200"
                  >
                    <img
                      src={dayTripLocationFilterIconMap[selectedDayTripFilter] || dayTripLocationFilterIconMap['all_day_trips']}
                      alt={locale === 'zh' ? '其他筛选' : 'Other Filters'}
                      style={{ height: vw(96), width: 'auto', filter: selectedDayTripFilter !== 'all_day_trips' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none' }}
                    />
                  </button>
                  {isDayTripLocationFilterHovered && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: vw(8),
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <MixedText
                        text={locale === 'zh' ? '其他筛选' : 'Other Filters'}
                        chineseFont="MarioFontTitleChinese, sans-serif"
                        englishFont="MarioFontTitle, sans-serif"
                        fontSize={vw(24)}
                        color="#F6F6F6"
                        component="p"
                        sx={{
                          textShadow: `${vw(2)} ${vw(2)} 0px #373737`,
                          margin: 0
                        }}
                      />
                    </Box>
                  )}
                </div>
              </div>
            </Box>
          </Box>
        </Box>
      )}

      {/* Day Trips & Weekend Trips Section - Mobile Only */}
      {dayTripJourneys.length > 0 && currentDayTrip && (
        <Box
          component="section"
          className="w-full"
          sx={{
            display: { xs: 'block', md: 'none' },
            paddingTop: vw(48, 'mobile'),
            paddingBottom: vw(48, 'mobile'),
            backgroundImage: 'url(/images/backgrounds/homepage_background.webp)',
            backgroundRepeat: 'repeat',
            backgroundSize: '100vw auto',
          }}
        >
          <Box sx={{ marginLeft: 'auto', marginRight: 'auto', paddingLeft: vw(16, 'mobile'), paddingRight: vw(16, 'mobile') }}>
            {/* Mobile: Map View Title */}
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: vw(32, 'mobile'), marginTop: vw(16, 'mobile'), textAlign: 'center' }}>
              <div style={{ lineHeight: '0.8' }}>
                <MixedText
                  text={locale === 'zh' ? '一日游&周末旅行' : 'Day Trips'}
                  chineseFont="MarioFontTitleChinese, sans-serif"
                  englishFont="MarioFontTitle, sans-serif"
                  fontSize={vw(40, 'mobile')}
                  color="#F6F6F6"
                  component="h3"
                  sx={{
                    textShadow: `${vw(2, 'mobile')} ${vw(2, 'mobile')} 0px #373737`,
                    margin: 0,
                    lineHeight: 0.8
                  }}
                />
                {locale === 'en' && (
                  <>
                    <MixedText
                      text="&"
                      chineseFont="MarioFontTitleChinese, sans-serif"
                      englishFont="MarioFontTitle, sans-serif"
                      fontSize={vw(40, 'mobile')}
                      color="#F6F6F6"
                      component="h3"
                      sx={{
                        textShadow: `${vw(2, 'mobile')} ${vw(2, 'mobile')} 0px #373737`,
                        margin: 0,
                        lineHeight: 0.8
                      }}
                    />
                    <MixedText
                      text="Weekend Trips"
                      chineseFont="MarioFontTitleChinese, sans-serif"
                      englishFont="MarioFontTitle, sans-serif"
                      fontSize={vw(40, 'mobile')}
                      color="#F6F6F6"
                      component="h3"
                      sx={{
                        textShadow: `${vw(2, 'mobile')} ${vw(2, 'mobile')} 0px #373737`,
                        margin: 0,
                        lineHeight: 0.8
                      }}
                    />
                  </>
                )}
              </div>
              <MixedText
                text={locale === 'zh' ? '使用屏幕两侧的按钮，来看我的更多旅行吧！' : 'Use left and right buttons on the side to view more trips!'}
                chineseFont="MarioFontChinese, sans-serif"
                englishFont="MarioFont, sans-serif"
                fontSize={vw(16, 'mobile')}
                color="#F6F6F6"
                component="p"
                sx={{
                  margin: 0,
                  marginTop: vw(32, 'mobile'),
                  textAlign: 'center',
                  paddingX: vw(16, 'mobile')
                }}
              />
            </Box>

            {/* Mobile: View Hints Button */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: vw(48, 'mobile') }}>
              <button
                onClick={() => setIsViewHintsDrawerOpen(true)}
                className="hover:scale-105 transition-transform duration-200"
              >
                <img
                  src={`/images/buttons/view_hints_button_${locale}.png`}
                  alt="View Hints"
                  style={{ height: vw(64, 'mobile'), width: 'auto' }}
                />
              </button>
            </Box>

            {/* Day Trip Info Card - Above map */}
            <Box sx={{ marginTop: vw(80, 'mobile') }}>
              <MapViewHint
                imageOnRight={true}
                cardNumber={3}
                isJourneyInfo={true}
                journeySlug={currentDayTrip.slug}
                station={{
                  id: '',
                  name: locale === 'zh' && currentDayTrip.nameCN ? currentDayTrip.nameCN : currentDayTrip.name,
                  journeyName: currentDayTripRoute,
                  date: formatDuration(currentDayTrip.days, currentDayTrip.nights, tr),
                  images: []
                }}
              />
            </Box>

            <Box sx={{ position: 'relative', marginX: vw(-8, 'mobile'), marginTop: vw(-24, 'mobile') }}>
              <Box
                sx={{
                  backgroundImage: 'url(/images/destinations/destination_page_map_box_background.webp)',
                  backgroundRepeat: 'repeat',
                  backgroundSize: `${vw(200, 'mobile')} auto`,
                  padding: vw(8, 'mobile'),
                  borderRadius: vw(12, 'mobile')
                }}
              >
                <InteractiveMap
                  places={currentDayTripPlaces}
                  routeSegments={currentDayTrip?.segments}
                  routeCoordinates={currentDayTripRouteCoordinates}
                  journeyDate={currentDayTrip?.startDate}
                />
              </Box>

              {/* Previous Button */}
              <Box
                component="button"
                onClick={handlePrevDayTrip}
                disabled={currentDayTripIndex === 0}
                className={`group ${
                  currentDayTripIndex === 0 ? 'opacity-40 cursor-default' : 'cursor-pointer'
                }`}
                sx={{
                  position: 'absolute',
                  left: vw(-8, 'mobile'),
                  top: '50%',
                  transform: 'translateY(-50%)',
                  transition: 'transform 0.2s',
                  '&:not(:disabled):hover': { transform: 'translateY(-50%) scale(1.05)' },
                  zIndex: 1001,
                  background: 'none',
                  border: 'none',
                  padding: 0
                }}
              >
                <img
                  src="/images/buttons/tab_prev.webp"
                  alt={tr.previousJourney}
                  className={`${currentDayTripIndex === 0 ? '' : 'group-hover:hidden'}`}
                  style={{ height: vw(96, 'mobile'), width: 'auto' }}
                />
                <img
                  src="/images/buttons/tab_prev_hover.webp"
                  alt={tr.previousJourney}
                  className={`${currentDayTripIndex === 0 ? 'hidden' : 'hidden group-hover:block'}`}
                  style={{ height: vw(96, 'mobile'), width: 'auto' }}
                />
              </Box>

              {/* Next Button */}
              <Box
                component="button"
                onClick={handleNextDayTrip}
                disabled={currentDayTripIndex === dayTripJourneys.length - 1}
                className={`group ${
                  currentDayTripIndex === dayTripJourneys.length - 1 ? 'opacity-40 cursor-default' : 'cursor-pointer'
                }`}
                sx={{
                  position: 'absolute',
                  right: vw(-8, 'mobile'),
                  top: '50%',
                  transform: 'translateY(-50%)',
                  transition: 'transform 0.2s',
                  '&:not(:disabled):hover': { transform: 'translateY(-50%) scale(1.05)' },
                  zIndex: 1001,
                  background: 'none',
                  border: 'none',
                  padding: 0
                }}
              >
                <img
                  src="/images/buttons/tab_next.webp"
                  alt={tr.nextJourney}
                  className={`${currentDayTripIndex === dayTripJourneys.length - 1 ? '' : 'group-hover:hidden'}`}
                  style={{ height: vw(96, 'mobile'), width: 'auto' }}
                />
                <img
                  src="/images/buttons/tab_next_hover.webp"
                  alt={tr.nextJourney}
                  className={`${currentDayTripIndex === dayTripJourneys.length - 1 ? 'hidden' : 'hidden group-hover:block'}`}
                  style={{ height: vw(96, 'mobile'), width: 'auto' }}
                />
              </Box>
            </Box>

            {/* Filter Buttons - Mobile Only - Below Map */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: vw(48, 'mobile'), width: '100%' }}>
              {/* Day Trips & Weekend Trips Filters Label */}
              <div style={{ lineHeight: '0.8', textAlign: 'center' }}>
                <MixedText
                  text={locale === 'zh' ? '一日游&周末旅行筛选条件' : 'Day Trips &'}
                  chineseFont="MarioFontTitleChinese, sans-serif"
                  englishFont="MarioFontTitle, sans-serif"
                  fontSize={vw(24, 'mobile')}
                  color="#F6F6F6"
                  component="p"
                  sx={{
                    textShadow: `${vw(2, 'mobile')} ${vw(2, 'mobile')} 0px #373737`,
                    margin: 0,
                    lineHeight: 0.8
                  }}
                />
                {locale === 'en' && (
                  <MixedText
                    text="Weekend Trips Filters"
                    chineseFont="MarioFontTitleChinese, sans-serif"
                    englishFont="MarioFontTitle, sans-serif"
                    fontSize={vw(24, 'mobile')}
                    color="#F6F6F6"
                    component="p"
                    sx={{
                      textShadow: `${vw(2, 'mobile')} ${vw(2, 'mobile')} 0px #373737`,
                      margin: 0,
                      lineHeight: 0.8
                    }}
                  />
                )}
              </div>
              <div
                className="flex justify-center items-center"
                style={{
                  backgroundImage: 'url(/images/backgrounds/filter_desktop_background_yellow.png)',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  height: vw(100, 'mobile'),
                  width: '100%',
                  maxWidth: vw(400, 'mobile'),
                  gap: vw(16, 'mobile')
                }}
              >
                {/* Day Trip Group Size Filter Button */}
                <button
                  onClick={() => setIsDayTripGroupSizeFilterDrawerOpen(true)}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={dayTripGroupSizeFilterIconMap[selectedDayTripGroupSizeFilter] || dayTripGroupSizeFilterIconMap['all_day_trip_group_sizes']}
                    alt={locale === 'zh' ? '用人数筛选' : 'Filter by Group Size'}
                    style={{ height: vw(64, 'mobile'), width: 'auto', filter: selectedDayTripGroupSizeFilter !== 'all_day_trip_group_sizes' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none' }}
                  />
                </button>

                {/* Day Trip Location Filter Button */}
                <button
                  onClick={() => setIsDayTripFilterDrawerOpen(true)}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={dayTripLocationFilterIconMap[selectedDayTripFilter] || dayTripLocationFilterIconMap['all_day_trips']}
                    alt={locale === 'zh' ? '其他筛选' : 'Other Filters'}
                    style={{ height: vw(64, 'mobile'), width: 'auto', filter: selectedDayTripFilter !== 'all_day_trips' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none' }}
                  />
                </button>
              </div>
            </Box>
          </Box>
        </Box>
      )}

      <Box
        component="section"
        ref={listSectionRef}
        className="w-full"
        sx={{
          paddingTop: rvw(48, 96),
          paddingBottom: rvw(48, 96),
          backgroundImage: 'url(/images/destinations/destination_page_list_background_shade.webp), url(/images/destinations/destination_page_list_background.webp)',
          backgroundRepeat: 'repeat-y, repeat',
          backgroundSize: { xs: `100% auto, ${vw(400, 'mobile')} auto`, md: `100% auto, ${vw(400)} auto` },
        }}
      >
        <Box sx={{ maxWidth: { xs: 'none', md: vw(1280) }, marginLeft: 'auto', marginRight: 'auto', paddingLeft: rvw(16, 32), paddingRight: rvw(16, 32) }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: rvw(32, 64), marginTop: rvw(16, 32) }}>
            <MixedText
              text={tr.listOfJourneys}
              chineseFont="MarioFontTitleChinese, sans-serif"
              englishFont="MarioFontTitle, sans-serif"
              fontSize={rvw(40, 64)}
              color="#373737"
              component="h2"
              sx={{
                textShadow: rShadow(2, 3, '#F6F6F6'),
                margin: 0,
                marginBottom: rvw(16, 16)
              }}
            />
            <MixedText
              text={tr.clickToViewDetails}
              chineseFont="MarioFontChinese, sans-serif"
              englishFont="MarioFont, sans-serif"
              fontSize={rvw(16, 28)}
              color="#373737"
              component="p"
              sx={{ margin: 0 }}
            />
          </Box>

          {/* Search Bar - Desktop */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', alignItems: 'center', marginBottom: vw(32) }}>
            <Box
              sx={{ width: '100%', maxWidth: vw(672) }}
              style={{
                backgroundImage: 'url(/images/backgrounds/search_background.png)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                padding: `${vw(24)} ${vw(16)}`,
                height: vw(110),
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'zh' ? '搜索旅行...' : 'Search journeys...'}
                className="journey-search-input"
                style={{
                  width: '100%',
                  padding: `${vw(12)} ${vw(12)} ${vw(12)} ${vw(96)}`,
                  fontSize: vw(24),
                  fontFamily: 'MarioFontTitle, MarioFontTitleChinese, sans-serif',
                  borderRadius: vw(8),
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#F6F6F6',
                  outline: 'none'
                }}
              />
            </Box>
          </Box>

          {/* Filter Buttons - Desktop Only - List Section */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', alignItems: 'center', marginBottom: vw(192) }}>
            {/* List Filters Label */}
            <MixedText
              text={locale === 'zh' ? '列表筛选条件' : 'List Filters'}
              chineseFont="MarioFontTitleChinese, sans-serif"
              englishFont="MarioFontTitle, sans-serif"
              fontSize={vw(24)}
              color="#373737"
              component="p"
              sx={{
                textShadow: `${vw(2)} ${vw(2)} 0px #F6F6F6`,
                margin: 0,
                marginBottom: vw(8)
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: vw(32),
                backgroundImage: 'url(/images/backgrounds/filter_desktop_background.png)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                height: vw(140),
                width: '100%',
                maxWidth: vw(900)
              }}
            >
              {/* Trip Length Filter Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsTripLengthFilterDrawerOpen(true)}
                  onMouseEnter={() => setIsTripLengthFilterHovered(true)}
                  onMouseLeave={() => setIsTripLengthFilterHovered(false)}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={tripLengthFilterIconMap[selectedTripLengthFilter] || tripLengthFilterIconMap['all_trips']}
                    alt={locale === 'zh' ? '用旅行时长筛选' : 'Filter by Trip Length'}
                    style={{
                      height: vw(96),
                      width: 'auto',
                      filter: selectedTripLengthFilter !== 'all_trips' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                    }}
                  />
                </button>
                {isTripLengthFilterHovered && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: vw(8),
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <MixedText
                      text={locale === 'zh' ? '用旅行时长筛选' : 'Filter by Trip Length'}
                      chineseFont="MarioFontTitleChinese, sans-serif"
                      englishFont="MarioFontTitle, sans-serif"
                      fontSize={vw(24)}
                      color="#373737"
                      component="p"
                      sx={{
                        textShadow: `${vw(2)} ${vw(2)} 0px #F6F6F6`,
                        margin: 0
                      }}
                    />
                  </Box>
                )}
              </div>

              {/* Group Size Filter Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsListGroupSizeFilterDrawerOpen(true)}
                  onMouseEnter={() => setIsListGroupSizeFilterHovered(true)}
                  onMouseLeave={() => setIsListGroupSizeFilterHovered(false)}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={listGroupSizeFilterIconMap[selectedListGroupSizeFilter] || listGroupSizeFilterIconMap['all_group_sizes']}
                    alt={locale === 'zh' ? '用人数筛选' : 'Filter by Group Size'}
                    style={{
                      height: vw(96),
                      width: 'auto',
                      filter: selectedListGroupSizeFilter !== 'all_group_sizes' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                    }}
                  />
                </button>
                {isListGroupSizeFilterHovered && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: vw(8),
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <MixedText
                      text={locale === 'zh' ? '用人数筛选' : 'Filter by Group Size'}
                      chineseFont="MarioFontTitleChinese, sans-serif"
                      englishFont="MarioFontTitle, sans-serif"
                      fontSize={vw(24)}
                      color="#373737"
                      component="p"
                      sx={{
                        textShadow: `${vw(2)} ${vw(2)} 0px #F6F6F6`,
                        margin: 0
                      }}
                    />
                  </Box>
                )}
              </div>

              {/* Combined Other Filter Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsCombinedOtherFilterDrawerOpen(true)}
                  onMouseEnter={() => setIsCombinedOtherFilterHovered(true)}
                  onMouseLeave={() => setIsCombinedOtherFilterHovered(false)}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={getCombinedOtherFilterIcon()}
                    alt={locale === 'zh' ? '其他筛选' : 'Other Filters'}
                    style={{
                      height: vw(96),
                      width: 'auto',
                      filter: (selectedTripLengthFilter === 'long_trips' && selectedCombinedOtherFilter !== 'all_transportation') ||
                             (selectedTripLengthFilter === 'day_trips' && selectedCombinedOtherFilter !== 'all_day_trips') ||
                             (selectedTripLengthFilter === 'all_trips' && selectedCombinedOtherFilter !== 'all_transportation')
                             ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                    }}
                  />
                </button>
                {isCombinedOtherFilterHovered && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: vw(8),
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <MixedText
                      text={locale === 'zh' ? '其他筛选' : 'Other Filters'}
                      chineseFont="MarioFontTitleChinese, sans-serif"
                      englishFont="MarioFontTitle, sans-serif"
                      fontSize={vw(24)}
                      color="#373737"
                      component="p"
                      sx={{
                        textShadow: `${vw(2)} ${vw(2)} 0px #F6F6F6`,
                        margin: 0
                      }}
                    />
                  </Box>
                )}
              </div>
            </div>
          </Box>

          {/* Search Bar - Mobile */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', alignItems: 'center', marginBottom: vw(16, 'mobile') }}>
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundImage: 'url(/images/backgrounds/search_background_short.png)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                padding: vw(16, 'mobile')
              }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'zh' ? '搜索旅行...' : 'Search journeys...'}
                className="journey-search-input"
                style={{
                  width: '100%',
                  padding: `${vw(12, 'mobile')} ${vw(12, 'mobile')} ${vw(12, 'mobile')} ${vw(48, 'mobile')}`,
                  fontSize: vw(24, 'mobile'),
                  fontFamily: 'MarioFontTitle, MarioFontTitleChinese, sans-serif',
                  borderRadius: vw(8, 'mobile'),
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#F6F6F6',
                  outline: 'none'
                }}
              />
            </div>
          </Box>

          {/* Filter Buttons and Sort Button - Mobile */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', alignItems: 'center', gap: vw(8, 'mobile'), marginBottom: vw(48, 'mobile') }}>
            {/* Filter Buttons Group - Icon Style */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              {/* List Filters Label */}
              <MixedText
                text={locale === 'zh' ? '列表筛选条件' : 'List Filters'}
                chineseFont="MarioFontTitleChinese, sans-serif"
                englishFont="MarioFontTitle, sans-serif"
                fontSize={vw(24, 'mobile')}
                color="#373737"
                component="p"
                sx={{
                  textShadow: `${vw(2, 'mobile')} ${vw(2, 'mobile')} 0px #F6F6F6`,
                  margin: 0
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: vw(16, 'mobile'),
                  backgroundImage: 'url(/images/backgrounds/filter_desktop_background.png)',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  height: vw(100, 'mobile'),
                  width: '100%',
                  maxWidth: vw(400, 'mobile')
                }}
              >
                {/* Trip Length Filter Button */}
                <button
                  onClick={() => setIsTripLengthFilterDrawerOpen(true)}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={tripLengthFilterIconMap[selectedTripLengthFilter] || tripLengthFilterIconMap['all_trips']}
                    alt={locale === 'zh' ? '用旅行时长筛选' : 'Filter by Trip Length'}
                    style={{
                      height: vw(64, 'mobile'),
                      width: 'auto',
                      filter: selectedTripLengthFilter !== 'all_trips' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                    }}
                  />
                </button>

                {/* Group Size Filter Button */}
                <button
                  onClick={() => setIsListGroupSizeFilterDrawerOpen(true)}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={listGroupSizeFilterIconMap[selectedListGroupSizeFilter] || listGroupSizeFilterIconMap['all_group_sizes']}
                    alt={locale === 'zh' ? '用人数筛选' : 'Filter by Group Size'}
                    style={{
                      height: vw(64, 'mobile'),
                      width: 'auto',
                      filter: selectedListGroupSizeFilter !== 'all_group_sizes' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                    }}
                  />
                </button>

                {/* Combined Other Filter Button */}
                <button
                  onClick={() => setIsCombinedOtherFilterDrawerOpen(true)}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={getCombinedOtherFilterIcon()}
                    alt={locale === 'zh' ? '其他筛选' : 'Other Filters'}
                    style={{
                      height: vw(64, 'mobile'),
                      width: 'auto',
                      filter: (selectedTripLengthFilter === 'long_trips' && selectedCombinedOtherFilter !== 'all_transportation') ||
                             (selectedTripLengthFilter === 'day_trips' && selectedCombinedOtherFilter !== 'all_day_trips') ||
                             (selectedTripLengthFilter === 'all_trips' && selectedCombinedOtherFilter !== 'all_transportation')
                             ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                    }}
                  />
                </button>
              </div>
            </div>
          </Box>

          {/* Empty State - When no results */}
          {sortedTrips.length === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingY: rvw(96, 96) }}>
              <MixedText
                text={tr.noResults}
                chineseFont="MarioFontTitleChinese, sans-serif"
                englishFont="MarioFontTitle, sans-serif"
                fontSize={rvw(32, 48)}
                color="#373737"
                component="h2"
                sx={{
                  textShadow: rShadow(2, 3, '#F6F6F6'),
                  margin: 0,
                  marginBottom: rvw(16, 16),
                  textAlign: 'center'
                }}
              />
              <MixedText
                text={tr.noMatchingResult}
                chineseFont="MarioFontChinese, sans-serif"
                englishFont="MarioFont, sans-serif"
                fontSize={rvw(16, 24)}
                color="#373737"
                component="p"
                sx={{ margin: 0, textAlign: 'center' }}
              />
            </Box>
          )}

          {/* Journeys Grid - Desktop with pagination */}
          {sortedTrips.length > 0 && (
            <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '1fr', gap: vw(192) }}>
              {displayedTrips.map((trip, index) => (
                <JourneyCard key={trip.slug} journey={trip} index={index} />
              ))}
            </Box>
          )}

          {/* Journeys Grid - XS with show more */}
          {sortedTrips.length > 0 && (
            <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: '1fr', gap: vw(48, 'mobile') }}>
              {displayedTripsXs.map((trip, index) => (
                <JourneyCard key={trip.slug} journey={trip} index={index} />
              ))}
            </Box>
          )}

          {/* Show More Button - XS only */}
          {xsDisplayCount < sortedTrips.length && (
            <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', marginTop: vw(48, 'mobile') }}>
              <button
                onClick={handleShowMore}
                className="hover:scale-105 transition-transform duration-200"
              >
                <img
                  src={`/images/buttons/show_more_xs_${locale}.png`}
                  alt="Show more"
                  style={{ height: vw(48, 'mobile'), width: 'auto' }}
                />
              </button>
            </Box>
          )}

          {/* Pagination - Desktop only */}
          {totalPages > 1 && (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', marginTop: vw(192) }}>
              <Box
                sx={{
                  backgroundImage: 'url(/images/destinations/destination_page_map_box_background.webp)',
                  backgroundRepeat: 'repeat',
                  backgroundSize: `${vw(200)} auto`,
                  padding: vw(8),
                  borderRadius: vw(16)
                }}
              >
                <Box
                  sx={{
                    borderWidth: vw(2),
                    borderStyle: 'solid',
                    borderColor: '#F6F6F6',
                    borderRadius: vw(12),
                    padding: vw(24),
                    backgroundImage: 'url(/images/destinations/destination_page_map_box_background.webp)',
                    backgroundRepeat: 'repeat',
                    backgroundSize: `${vw(200)} auto`
                  }}
                >
                  {/* Page Info */}
                  <MixedText
                    text={tr.pageOfPages(currentPage, totalPages)}
                    chineseFont="MarioFontTitleChinese, sans-serif"
                    englishFont="MarioFontTitle, sans-serif"
                    fontSize={vw(24)}
                    color="#F6F6F6"
                    component="p"
                    sx={{ textAlign: 'center', marginBottom: vw(32) }}
                  />

                  {/* Pagination Controls */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: vw(16) }}>
                    {/* Previous Button */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`group transition-transform duration-200 ${currentPage === 1 ? 'opacity-40' : 'hover:scale-105 cursor-pointer'}`}
                    >
                      <img
                        src="/images/buttons/arrow_prev.webp"
                        alt={tr.previous}
                        style={{ width: vw(64), height: vw(64) }}
                        className={`${currentPage === 1 ? '' : 'group-hover:hidden'}`}
                      />
                      <img
                        src="/images/buttons/arrow_prev_hover.webp"
                        alt={tr.previous}
                        style={{ width: vw(64), height: vw(64) }}
                        className={`${currentPage === 1 ? 'hidden' : 'hidden group-hover:block'}`}
                      />
                    </button>

                    {/* Page Numbers */}
                    <div style={{ display: 'flex', gap: vw(8) }}>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current
                        const showPage =
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)

                        if (!showPage) {
                          // Show ellipsis
                          if (page === currentPage - 2 || page === currentPage + 2) {
                            return (
                              <span
                                key={page}
                                style={{ fontFamily: 'MarioFontTitle, sans-serif', fontSize: vw(24), color: '#F6F6F6', paddingLeft: vw(8), paddingRight: vw(8) }}
                              >
                                ...
                              </span>
                            )
                          }
                          return null
                        }

                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            style={{
                              fontFamily: 'MarioFontTitle, sans-serif',
                              fontSize: vw(24),
                              width: vw(56),
                              paddingTop: vw(8),
                              paddingBottom: vw(8),
                              borderRadius: vw(8),
                              ...(currentPage === page
                                ? { borderWidth: vw(2), borderStyle: 'solid', borderColor: '#F6F6F6' }
                                : {})
                            }}
                            className={`transition-all duration-200 ${
                              currentPage === page
                                ? 'bg-[#373737] text-white'
                                : 'bg-[#F6F6F6] text-[#373737] hover:bg-[#FFD701]'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      })}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`group transition-transform duration-200 ${currentPage === totalPages ? 'opacity-40' : 'hover:scale-105 cursor-pointer'}`}
                    >
                      <img
                        src="/images/buttons/arrow_next.webp"
                        alt={tr.next}
                        style={{ width: vw(64), height: vw(64) }}
                        className={`${currentPage === totalPages ? '' : 'group-hover:hidden'}`}
                      />
                      <img
                        src="/images/buttons/arrow_next_hover.webp"
                        alt={tr.next}
                        style={{ width: vw(64), height: vw(64) }}
                        className={`${currentPage === totalPages ? 'hidden' : 'hidden group-hover:block'}`}
                      />
                    </button>
                  </div>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      <Footer currentPage="trips" />
    </div>
  )
}
