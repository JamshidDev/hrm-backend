<?php

namespace Modules\Turnstile\Transformers;

use App\Http\Resources\User\UserWorkerResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;

class TurnstileApproveResource extends JsonResource
{

    protected User $sendedUser;

    public function __construct($resource, $user)
    {
        parent::__construct($resource);
        $this->sendedUser = $user;
    }


    public function toArray(Request $request): array
    {
        if ($this->sendedUser->organization_id === $this->organization_id) {
            $s = 'sended';
        } else {
            $s = 'received';
        }

        return [
            'id' => $this->id,
            'organization' => new OrganizationListResource($this->organization),
            'receiver_organization' => new OrganizationListResource($this->receiver_organization),
            'title' => $this->title,
            'description' => $this->description,
            'approved' => $this->approved,
            'user' => new UserWorkerResource($this->user),
            'receiver_user' => new UserWorkerResource($this->receiver_user),
            'status' => $s
        ];
    }
}
