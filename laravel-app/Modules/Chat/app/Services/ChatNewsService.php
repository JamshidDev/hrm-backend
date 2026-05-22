<?php

namespace Modules\Chat\Services;

use App\Http\Resources\PaginateResource;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Support\Facades\DB;
use Modules\Chat\Models\ChatNews;
use Modules\Chat\Transformers\Chat\ChatNewsListResource;

class ChatNewsService
{
    use Base64FileUploadTrait;

    public function store(array $data, $user)
    {
        return DB::transaction(function () use ($data, $user) {
            $news = ChatNews::create([
                'organization_id' => $user->organization_id,
                'slug' => $data['slug'] ?? null,
                'status' => $data['status'],
                'published_at' => $data['published_at'] ?? null,
                'is_pinned' => $data['is_pinned'] ?? false,
            ]);
            // Translations
            foreach ($data['translations'] as $translation) {
                $news->translations()->create($translation);
            }
            // Media
            $this->extracted($news);
            return $news->load(['translations', 'media']);
        });
    }

    public function update(ChatNews $news, array $data, $user)
    {
        return DB::transaction(function () use ($news, $data, $user) {
            $news->update($data);

            // Translations sync
            if (array_key_exists('translations', $data) && $data['translations']) {
                foreach ($data['translations'] as $translation) {
                    $news->translations()->updateOrCreate(
                        [
                            'locale' => $translation['locale']
                        ],
                        $translation
                    );
                }
            }

            // Media sync (oddiy variant)
            if (array_key_exists('media', $data) && $data['media']) {
                $news->media()->delete();
                $this->extracted($news);
            }
            return $news->load(['translations', 'media']);
        });
    }

    public function delete(ChatNews $news): void
    {
        $news->delete();
    }

    public function list($filters, $userId): PaginateResource
    {
        $news = ChatNews::query()
            ->with([
                'categories',
                'media',
                'translations'
            ])
            ->withExists([
                'views as is_viewed' => function ($q) use ($userId) {
                    $q->where('user_id', $userId);
                },
                'likes as has_liked' => function ($q) use ($userId) {
                    $q->where('user_id', $userId)->where('reaction', 1);
                },
                'likes as has_disliked' => function ($q) use ($userId) {
                    $q->where('user_id', $userId)->where('reaction', -1);
                }
            ])
            ->whereStatus(1)
            ->orderByDesc('published_at')
            ->paginate($filters['per_page'] ?? 5);

        return PaginateResource::make($news, ChatNewsListResource::class);
    }


    private function extracted(ChatNews $news): void
    {
        if (!empty($data['media'])) {
            foreach ($data['media'] as $media) {
                $file = $media['file'];
                $filePath = $this->uploadFormFile($file, 'chat-media', ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg']);
                $media['path'] = $filePath;
                $media['extension'] = $file->getClientOriginalExtension();
                $media['size'] = $file->getSize();
                $news->media()->create($media);
            }
        }

        if (!empty($data['categories'])) {
            $news->categories()->sync($data['categories']);
        }
    }
}
