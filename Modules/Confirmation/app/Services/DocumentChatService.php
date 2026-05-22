<?php

namespace Modules\Confirmation\Services;

use App\Http\Resources\PaginateResource;
use App\Http\Resources\User\UserLittleResource;
use App\Models\User;
use Modules\Confirmation\Models\DocumentChat;
use Modules\Confirmation\Transformers\DocumentChatResource;

readonly class DocumentChatService
{
    public function __construct(
        private DocumentContextResolverService $resolver,
    ) {
    }

    public function getUsers($request, $user)
    {
        $modelContext = $this->resolver->resolveModelContext($request->model);
        $confirmationModel = $modelContext->confirmationModelClass();
        $foreignKey = $modelContext->foreignKey();
        $documentModel = $modelContext->model();

        $workerIds = $confirmationModel::query()
            ->where($foreignKey, $request->document_id)
            ->pluck('worker_id');

        $messagedUsers = DocumentChat::query()
            ->where('model_type', $documentModel)
            ->where('model_id', $request->document_id)
            ->get(['sender_id', 'recipient_id'])
            ->flatMap(fn($item) => [$item->sender_id, $item->recipient_id])
            ->unique()
            ->values()
            ->all();

        $document = $this->resolver->resolveDocument($modelContext, $request->document_id);

        $users = User::query()
            ->whereNot('id', $user->id)
            ->where(function ($query) use ($document, $workerIds) {
                $query->whereIn('worker_id', $workerIds)
                    ->orWhere('id', $document->user_id);
            })
            ->orWhereIn('id', $messagedUsers)
            ->get();

        return UserLittleResource::collection($users);
    }

    public function sendMessage($request, $sender): DocumentChatResource
    {
        $model = $this->resolver->resolveModelContext($request->model)->model();

        $message = DocumentChat::create([
            'model_type' => $model,
            'model_id' => $request->document_id,
            'message' => $request->message,
            'sender_id' => $sender->id,
            'recipient_id' => $request->recipient_id,
        ]);

        return new DocumentChatResource($message);
    }

    public function getMessages($request, $user)
    {
        $model = $this->resolver->resolveModelContext($request->model)->model();
        $perPage = $request->per_page ?? 10;

        $messages = DocumentChat::query()
            ->where('model_type', $model)
            ->where('model_id', $request->document_id)
            ->where(function ($query) use ($user) {
                $query->where('sender_id', $user->id)
                    ->orWhere('recipient_id', $user->id);
            })
            ->when($request->user_id, function ($query, $userId) {
                $query->where(function ($innerQuery) use ($userId) {
                    $innerQuery->where('sender_id', $userId)
                        ->orWhere('recipient_id', $userId);
                });
            })
            ->with(['sender', 'recipient'])
            ->orderByDesc('id')
            ->paginate($perPage);

        return PaginateResource::make($messages, DocumentChatResource::class);
    }

    public function deleteMessage(int $messageId): void
    {
        DocumentChat::find($messageId)?->delete();
    }

    public function readMessages(array $messageIds): void
    {
        DocumentChat::whereIn('id', $messageIds)->update(['read_at' => now()]);
    }
}
