'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import dynamic from 'next/dynamic'
import Fuse from 'fuse.js'
import Footer from 'src/components/Footer'
import NavigationMenu from 'src/components/NavigationMenu'
import ViewHintsDrawer from 'src/components/ViewHintsDrawer'
import MixedText from 'src/components/MixedText'
import DestinationCard from 'src/components/DestinationCard'
import { getRouteCoordinatesFromSegments } from 'src/utils/routeHelpers'
import { useTranslation } from 'src/hooks/useTranslation'
import { Search } from 'lucide-react'
import { vw, rvw, rShadow } from 'src/utils/scaling'

const InteractiveMap = dynamic(() => import('src/components/InteractiveMap'), {
  ssr: false,
  loading: () => {
    const { tr } = useTranslation()
    return (
      <Box sx={{ width: '100%', height: { xs: 'auto', md: vw(600) }, aspectRatio: { xs: '2/3', md: 'unset' }, borderRadius: rvw(8, 8), backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-gray-600">{tr.loadingMap}</p>
      </Box>
    )
  }
})

interface Journey {
  name: string
  nameCN?: string
  slug: string
  places: number
  description: string
  route: string
  routeCN?: string
  duration: string
  days: number
  nights: number
  visitedPlaceIds?: string[]
  journeyId?: string
  startDate?: string
  endDate?: string
  segments?: Array<{
    order: number
    from: { name: string; lat: number; lng: number }
    to: { name: string; lat: number; lng: number }
  }>
}

interface JourneyDetailClientProps {
  journey: Journey | undefined
}

export default function JourneyDetailClient({ journey }: JourneyDetailClientProps) {
  const { locale, tr } = useTranslation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMenuButtonVisible, setIsMenuButtonVisible] = useState(true)
  const [isDrawerAnimating, setIsDrawerAnimating] = useState(false)

  // Preload title images and backgrounds
  useEffect(() => {
    const preloadImages = [
      `https://res.cloudinary.com/joey-hou-homepage/image/upload/w_1920,f_auto,q_auto/joeyhoujournal/headers/journey_details_title_${locale}.jpg`,
      `https://res.cloudinary.com/joey-hou-homepage/image/upload/w_800,f_auto,q_auto/joeyhoujournal/headers/journey_details_title_xs_${locale}.jpg`,
      '/images/destinations/destination_page_map_background.webp',
      '/images/backgrounds/homepage_background_2.webp',
      '/images/destinations/destination_location_title.webp',
      '/images/destinations/destination_page_map_box_background.webp',
      '/images/destinations/destination_page_list_background.webp',
      '/images/destinations/destination_page_list_background_shade.webp'
    ]
    preloadImages.forEach(src => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = src
      document.head.appendChild(link)
    })
  }, [locale])
  const [isMenuButtonAnimating, setIsMenuButtonAnimating] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [xsDisplayCount, setXsDisplayCount] = useState(12)
  const [allDestinations, setAllDestinations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isViewHintsDrawerOpen, setIsViewHintsDrawerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const listSectionRef = useRef<HTMLDivElement>(null)

  // Fetch destinations from API
  useEffect(() => {
    async function fetchDestinations() {
      try {
        const response = await fetch('/api/destinations')
        const data = await response.json()
        setAllDestinations(data)

        // Preload first image from each destination for map popups and list cards
        data.forEach((dest: any) => {
          if (dest.images && dest.images.length > 0) {
            const link = document.createElement('link')
            link.rel = 'preload'
            link.as = 'image'
            link.href = dest.images[0]
            document.head.appendChild(link)
          }
        })
      } catch (error) {
        console.error('Error fetching destinations:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDestinations()
  }, [])

  // Filter places for this journey
  const places = useMemo(() => {
    return journey ? allDestinations.filter(
      destination => destination.journeyName === journey.name
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
  }, [journey, allDestinations])

  // Memoize route coordinates to prevent map re-rendering
  const routeCoordinates = useMemo(() => {
    return getRouteCoordinatesFromSegments(journey?.segments)
  }, [journey?.segments])

  const itemsPerPage = 12

  // Apply intelligent search filter with fuzzy matching
  const searchFilteredPlaces = useMemo(() => {
    if (!searchQuery.trim()) return places

    // Configure Fuse.js for intelligent fuzzy search
    const fuse = new Fuse(places, {
      keys: [
        { name: 'name', weight: 3 },     // Highest priority: English name
        { name: 'nameCN', weight: 3 },   // Highest priority: Chinese name
        { name: 'state', weight: 2 }     // Medium priority: State/province
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
  }, [places, searchQuery])

  const sortedPlaces = useMemo(() => {
    return [...searchFilteredPlaces].sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return dateB - dateA // Always sort by latest first
    })
  }, [searchFilteredPlaces])

  const totalPages = Math.ceil(sortedPlaces.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const displayedPlaces = sortedPlaces.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    if (listSectionRef.current) {
      listSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleShowMore = () => {
    setXsDisplayCount(prev => prev + itemsPerPage)
  }

  // For xs screens, use xsDisplayCount; for larger screens, use pagination
  const displayedPlacesXs = sortedPlaces.slice(0, xsDisplayCount)

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

  // Show loading state while data is being fetched
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
        <Box sx={{
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
        }}>
          {/* Spinner */}
          <Box
            sx={{
              width: rvw(60, 60),
              height: rvw(60, 60),
              borderWidth: rvw(6, 6),
              borderStyle: 'solid',
              borderColor: 'rgba(240, 96, 1, 0.2)',
              borderTopColor: '#F06001',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          {/* Loading text */}
          <Box sx={{
            fontFamily: locale === 'zh' ? 'MarioFontTitleChinese, sans-serif' : 'MarioFontTitle, sans-serif',
            fontSize: rvw(32, 32),
            color: '#373737'
          }}>
            {tr.loading}
          </Box>
        </Box>
      </>
    )
  }

  if (!journey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{tr.journeyNotFound}</h1>
          <Link href="/journeys" className="text-blue-600 hover:text-blue-800">
            {tr.backToJourneys}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <Box
      className="min-h-screen"
      sx={{
        backgroundImage: 'url(/images/destinations/destination_page_list_background_shade.webp), url(/images/destinations/destination_page_list_background.webp)',
        backgroundRepeat: 'repeat-y, repeat',
        backgroundSize: { xs: `100% auto, ${vw(400, 'mobile')} auto`, md: `100% auto, ${vw(400)} auto` },
      }}
    >
      <style jsx>{`
        .journey-detail-search-input::placeholder {
          color: #F6F6F6;
        }
      `}</style>
      <ViewHintsDrawer
        isOpen={isViewHintsDrawerOpen}
        onClose={() => setIsViewHintsDrawerOpen(false)}
      />
      <NavigationMenu
        isMenuOpen={isMenuOpen}
        isMenuButtonVisible={isMenuButtonVisible}
        isDrawerAnimating={isDrawerAnimating}
        isMenuButtonAnimating={isMenuButtonAnimating}
        openMenu={openMenu}
        closeMenu={closeMenu}
      />

      <Box sx={{ width: '100%' }}>
        <Box
          component="img"
          src={`https://res.cloudinary.com/joey-hou-homepage/image/upload/w_1920,f_auto,q_auto/joeyhoujournal/headers/journey_details_title_${locale}.jpg`}
          alt={tr.journeyDetails}
          sx={{ width: '100%', height: 'auto', objectFit: 'cover', display: { xs: 'none', md: 'block' } }}
        />
        <Box
          component="img"
          src={`https://res.cloudinary.com/joey-hou-homepage/image/upload/w_800,f_auto,q_auto/joeyhoujournal/headers/journey_details_title_xs_${locale}.jpg`}
          alt={tr.journeyDetails}
          sx={{ width: '100%', height: 'auto', objectFit: 'cover', display: { xs: 'block', md: 'none' } }}
        />
      </Box>

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
          {/* Journey Title with Background */}
          <Box sx={{ width: '100%', maxWidth: { xs: 'none', md: vw(800) }, margin: `${vw(32)} auto ${vw(32)}` }}>
            {/* Date Range */}
            {journey.startDate && journey.endDate && (
              <MixedText
                text={`${journey.startDate} — ${journey.endDate}`}
                chineseFont="MarioFontTitleChinese, sans-serif"
                englishFont="MarioFontTitle, sans-serif"
                fontSize={rvw(14, 20)}
                color="#FFD701"
                component="p"
                sx={{ textAlign: 'center', margin: 0, marginBottom: rvw(8, 12) }}
              />
            )}
            <Box sx={{ position: 'relative', width: '100%', marginBottom: rvw(32, 32) }}>
              <Box
                component="img"
                src="/images/destinations/destination_location_title.webp"
                alt="Journey Title"
                sx={{ width: '100%', height: 'auto', display: 'block' }}
              />
              <Box
                component="div"
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
              >
                <MixedText
                  text={locale === 'zh' && journey.nameCN ? journey.nameCN : journey.name}
                  chineseFont="MarioFontTitleChinese, sans-serif"
                  englishFont="MarioFontTitle, sans-serif"
                  fontSize={rvw(28, 48)}
                  color="#373737"
                  component="h2"
                  sx={{ margin: 0 }}
                />
              </Box>
            </Box>
          </Box>

          {/* Route Display - Desktop (horizontal with →) */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', alignItems: 'center', marginBottom: vw(64), marginTop: vw(32) }}>
            <MixedText
              text={locale === 'zh' && journey.routeCN ? journey.routeCN : journey.route}
              chineseFont="MarioFontTitleChinese, sans-serif"
              englishFont="MarioFontTitle, sans-serif"
              fontSize={vw(48)}
              color="#F6F6F6"
              component="p"
              sx={{
                textShadow: `${vw(3)} ${vw(3)} 0px #373737`,
                margin: 0
              }}
            />
          </Box>

          {/* Route Display - Mobile (centered vertically with ↓) */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: vw(32, 'mobile'), marginTop: vw(16, 'mobile') }}>
            {(() => {
              const routeText = locale === 'zh' && journey.routeCN ? journey.routeCN : journey.route
              const parts = routeText.split(' → ')
              return parts.map((part, i) => (
                <Box key={i}>
                  <MixedText
                    text={part.trim()}
                    chineseFont="MarioFontTitleChinese, sans-serif"
                    englishFont="MarioFontTitle, sans-serif"
                    fontSize={vw(28, 'mobile')}
                    color="#F6F6F6"
                    component="p"
                    sx={{
                      textShadow: `${vw(2, 'mobile')} ${vw(2, 'mobile')} 0px #373737`,
                      margin: 0,
                      textAlign: 'center'
                    }}
                  />
                  {i < parts.length - 1 && (
                    <MixedText
                      text="↓"
                      englishFont="MarioFontTitle, sans-serif"
                      chineseFont="MarioFontTitle, sans-serif"
                      fontSize={vw(28, 'mobile')}
                      color="#F6F6F6"
                      component="p"
                      sx={{
                        textShadow: `${vw(2, 'mobile')} ${vw(2, 'mobile')} 0px #373737`,
                        margin: 0,
                        textAlign: 'center'
                      }}
                    />
                  )}
                </Box>
              ))
            })()}
          </Box>

          {/* View Hints Button */}
          <Box className="flex justify-center" sx={{ marginBottom: rvw(48, 48) }}>
            <button
              onClick={() => setIsViewHintsDrawerOpen(true)}
              className="hover:scale-105 transition-transform duration-200"
            >
              <Box
                component="img"
                src={`/images/buttons/view_hints_button_${locale}.png`}
                alt="View Hints"
                sx={{ height: rvw(64, 80), width: 'auto' }}
              />
            </button>
          </Box>

          <Box sx={{ marginLeft: { xs: vw(-8, 'mobile'), md: 0 }, marginRight: { xs: vw(-8, 'mobile'), md: 0 } }}>
            <Box
              sx={{
                backgroundImage: 'url(/images/destinations/destination_page_map_box_background.webp)',
                backgroundRepeat: 'repeat',
                backgroundSize: { xs: `${vw(200, 'mobile')} auto`, md: `${vw(200)} auto` },
                padding: rvw(8, 16),
                borderRadius: rvw(12, 24)
              }}
            >
              <InteractiveMap
                places={places}
                routeSegments={journey?.segments}
                routeCoordinates={routeCoordinates}
                journeyDate={journey?.startDate}
              />
            </Box>
          </Box>
        </Box>
      </Box>

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
          <Box className="flex flex-col justify-center items-center" sx={{ marginBottom: rvw(32, 64), marginTop: rvw(16, 32) }}>
            <MixedText
              text={tr.listOfPlaces}
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
          <Box className="flex justify-center items-center" sx={{ marginBottom: vw(192), display: { xs: 'none', md: 'flex' } }}>
            <div
              className="w-full flex justify-center items-center"
              style={{
                maxWidth: vw(672),
                backgroundImage: 'url(/images/backgrounds/search_background.png)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                padding: `${vw(24)} ${vw(16)}`,
                height: vw(110)
              }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'zh' ? '搜索目的地...' : 'Search places...'}
                className="journey-detail-search-input"
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
            </div>
          </Box>

          {/* Search Bar - Mobile */}
          <Box className="flex justify-center items-center" sx={{ marginBottom: vw(48, 'mobile'), display: { xs: 'flex', md: 'none' } }}>
            <div
              className="w-full flex justify-center items-center"
              style={{
                maxWidth: vw(672, 'mobile'),
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
                placeholder={locale === 'zh' ? '搜索目的地...' : 'Search places...'}
                className="journey-detail-search-input"
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

          {/* Empty State - When no results */}
          {sortedPlaces.length === 0 && (
            <Box className="flex flex-col items-center justify-center" sx={{ paddingTop: rvw(96, 96), paddingBottom: rvw(96, 96) }}>
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

          {/* Places Grid - Desktop with pagination */}
          {sortedPlaces.length > 0 && (
            <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '1fr', gap: vw(192), marginBottom: totalPages <= 1 ? vw(192) : 0 }}>
              {displayedPlaces.map((place, index) => (
                <DestinationCard key={place.id} station={place} index={index} />
              ))}
            </Box>
          )}

          {/* Places Grid - XS with show more */}
          {sortedPlaces.length > 0 && (
            <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: '1fr', gap: vw(48, 'mobile'), marginBottom: xsDisplayCount >= sortedPlaces.length ? vw(48, 'mobile') : 0 }}>
              {displayedPlacesXs.map((place, index) => (
                <DestinationCard key={place.id} station={place} index={index} />
              ))}
            </Box>
          )}

          {/* Show More Button - XS only */}
          {xsDisplayCount < sortedPlaces.length && (
            <Box className="flex justify-center" sx={{ marginTop: vw(48, 'mobile'), marginBottom: vw(48, 'mobile'), display: { xs: 'flex', md: 'none' } }}>
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
            <Box className="flex justify-center" sx={{ marginTop: vw(192), display: { xs: 'none', md: 'flex' } }}>
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
                  <MixedText
                    text={tr.pageOfPages(currentPage, totalPages)}
                    chineseFont="MarioFontTitleChinese, sans-serif"
                    englishFont="MarioFontTitle, sans-serif"
                    fontSize={vw(24)}
                    color="#F6F6F6"
                    component="p"
                    sx={{ textAlign: 'center', marginBottom: vw(32) }}
                  />

                  <div className="flex justify-center items-center" style={{ gap: vw(16) }}>
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

                    <div className="flex" style={{ gap: vw(8) }}>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        const showPage =
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)

                        if (!showPage) {
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
                            style={{ fontFamily: 'MarioFontTitle, sans-serif', fontSize: vw(24), width: vw(56), paddingTop: vw(8), paddingBottom: vw(8), borderRadius: vw(8) }}
                            className={`transition-all duration-200 ${
                              currentPage === page
                                ? 'bg-[#373737] text-white border-2 border-[#F6F6F6]'
                                : 'bg-[#F6F6F6] text-[#373737] hover:bg-[#FFD701]'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      })}
                    </div>

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

      <Footer />
    </Box>
  )
}
