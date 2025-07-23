const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateUser, verifiedUserOnly } = require('../lib/auth');

const prisma = new PrismaClient();

// GET /api/favorites - Get user's favorite partners (verified users only)
router.get('/', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, category } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userId: req.user.id };
    if (category) {
      whereClause.category = category;
    }

    const favorites = await prisma.userFavorite.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        favorite: {
          select: {
            id: true,
            displayName: true,
            userType: true,
            genderIdentity: true,
            lastActivity: true,
            connectionState: true,
            availabilityStatus: true
          }
        }
      }
    });

    // Get total count for pagination
    const totalCount = await prisma.userFavorite.count({
      where: whereClause
    });

    // Check which favorites are mutual
    const enrichedFavorites = await Promise.all(
      favorites.map(async (fav) => {
        const mutualFavorite = await prisma.userFavorite.findUnique({
          where: {
            userId_favoriteId: {
              userId: fav.favoriteId,
              favoriteId: req.user.id
            }
          }
        });

        return {
          ...fav,
          isMutual: !!mutualFavorite
        };
      })
    );

    res.json({
      favorites: enrichedFavorites,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: offset + favorites.length < totalCount,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Favorites fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// POST /api/favorites - Add a user to favorites (verified users only)
router.post('/', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const { favoriteId, notes, category = 'general' } = req.body;

    // Validate favoriteId
    if (!favoriteId) {
      return res.status(400).json({ error: 'favoriteId is required' });
    }

    // Can't favorite yourself
    if (favoriteId === req.user.id) {
      return res.status(400).json({ error: 'Cannot favorite yourself' });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: favoriteId },
      select: { id: true, displayName: true, userType: true }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already favorited
    const existingFavorite = await prisma.userFavorite.findUnique({
      where: {
        userId_favoriteId: {
          userId: req.user.id,
          favoriteId: favoriteId
        }
      }
    });

    if (existingFavorite) {
      return res.status(400).json({ error: 'User already in favorites' });
    }

    // Create favorite
    const favorite = await prisma.userFavorite.create({
      data: {
        userId: req.user.id,
        favoriteId,
        notes,
        category
      },
      include: {
        favorite: {
          select: {
            id: true,
            displayName: true,
            userType: true,
            genderIdentity: true,
            lastActivity: true,
            connectionState: true
          }
        }
      }
    });

    // Check if this creates a mutual favorite
    const mutualFavorite = await prisma.userFavorite.findUnique({
      where: {
        userId_favoriteId: {
          userId: favoriteId,
          favoriteId: req.user.id
        }
      }
    });

    if (mutualFavorite) {
      // Update both favorites to mark as mutual
      await prisma.userFavorite.updateMany({
        where: {
          OR: [
            { userId: req.user.id, favoriteId: favoriteId },
            { userId: favoriteId, favoriteId: req.user.id }
          ]
        },
        data: { isMutual: true }
      });
    }

    // Update user analytics
    await prisma.sleepAnalytics.upsert({
      where: { userId: req.user.id },
      update: {
        favoritePartnersCount: {
          increment: 1
        }
      },
      create: {
        userId: req.user.id,
        favoritePartnersCount: 1
      }
    });

    // Log behavior event
    await prisma.userBehaviorEvent.create({
      data: {
        userId: req.user.id,
        eventType: 'favorite_add',
        eventCategory: 'social',
        eventData: {
          favoriteId,
          category,
          isMutual: !!mutualFavorite
        }
      }
    });

    res.json({
      message: 'User added to favorites',
      favorite: {
        ...favorite,
        isMutual: !!mutualFavorite
      }
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// PUT /api/favorites/:favoriteId - Update favorite notes/category (verified users only)
router.put('/:favoriteId', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const { favoriteId } = req.params;
    const { notes, category } = req.body;

    // Find and update the favorite
    const favorite = await prisma.userFavorite.findUnique({
      where: {
        userId_favoriteId: {
          userId: req.user.id,
          favoriteId: favoriteId
        }
      }
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    const updatedFavorite = await prisma.userFavorite.update({
      where: {
        userId_favoriteId: {
          userId: req.user.id,
          favoriteId: favoriteId
        }
      },
      data: {
        notes,
        category
      },
      include: {
        favorite: {
          select: {
            id: true,
            displayName: true,
            userType: true
          }
        }
      }
    });

    res.json({
      message: 'Favorite updated successfully',
      favorite: updatedFavorite
    });
  } catch (error) {
    console.error('Update favorite error:', error);
    res.status(500).json({ error: 'Failed to update favorite' });
  }
});

// DELETE /api/favorites/:favoriteId - Remove user from favorites (verified users only)
router.delete('/:favoriteId', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const { favoriteId } = req.params;

    // Find the favorite
    const favorite = await prisma.userFavorite.findUnique({
      where: {
        userId_favoriteId: {
          userId: req.user.id,
          favoriteId: favoriteId
        }
      }
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    // Check if it was mutual
    const wasMutual = favorite.isMutual;

    // Delete the favorite
    await prisma.userFavorite.delete({
      where: {
        userId_favoriteId: {
          userId: req.user.id,
          favoriteId: favoriteId
        }
      }
    });

    // If it was mutual, update the reverse favorite
    if (wasMutual) {
      await prisma.userFavorite.updateMany({
        where: {
          userId: favoriteId,
          favoriteId: req.user.id
        },
        data: { isMutual: false }
      });
    }

    // Update user analytics
    await prisma.sleepAnalytics.update({
      where: { userId: req.user.id },
      data: {
        favoritePartnersCount: {
          decrement: 1
        }
      }
    });

    // Log behavior event
    await prisma.userBehaviorEvent.create({
      data: {
        userId: req.user.id,
        eventType: 'favorite_remove',
        eventCategory: 'social',
        eventData: {
          favoriteId,
          wasMutual
        }
      }
    });

    res.json({ message: 'User removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// GET /api/favorites/mutual - Get mutual favorites (verified users only)
router.get('/mutual', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const mutualFavorites = await prisma.userFavorite.findMany({
      where: {
        userId: req.user.id,
        isMutual: true
      },
      include: {
        favorite: {
          select: {
            id: true,
            displayName: true,
            userType: true,
            genderIdentity: true,
            lastActivity: true,
            connectionState: true,
            availabilityStatus: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      mutualFavorites,
      count: mutualFavorites.length
    });
  } catch (error) {
    console.error('Mutual favorites error:', error);
    res.status(500).json({ error: 'Failed to fetch mutual favorites' });
  }
});

// GET /api/favorites/stats - Get favorites statistics (verified users only)
router.get('/stats', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const stats = await prisma.userFavorite.aggregate({
      where: { userId: req.user.id },
      _count: { id: true }
    });

    const mutualCount = await prisma.userFavorite.count({
      where: {
        userId: req.user.id,
        isMutual: true
      }
    });

    const categoryStats = await prisma.userFavorite.groupBy({
      by: ['category'],
      where: { userId: req.user.id },
      _count: { category: true }
    });

    // Get favorites who favorited back
    const favoritedByCount = await prisma.userFavorite.count({
      where: { favoriteId: req.user.id }
    });

    res.json({
      totalFavorites: stats._count.id || 0,
      mutualFavorites: mutualCount,
      favoritedBy: favoritedByCount,
      categories: categoryStats.map(cat => ({
        category: cat.category,
        count: cat._count.category
      }))
    });
  } catch (error) {
    console.error('Favorites stats error:', error);
    res.status(500).json({ error: 'Failed to fetch favorites statistics' });
  }
});

module.exports = router; 